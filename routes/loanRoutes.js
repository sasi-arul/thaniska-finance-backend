import express from "express";
import Loan from "../models/Loan.js";
import Collection from "../models/Collection.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  createLoan,
  getLoans,
  getLoanById,
  updateLoan,
  deleteLoan
} from "../controllers/loanController.js";

const router = express.Router();
const uploadsDir = path.join(process.cwd(), "uploads", "loans");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeField = file.fieldname.replace(/[^a-zA-Z0-9_-]/g, "");
    cb(null, `${safeField}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();

    if (file.fieldname === "photo") {
      if (mime.startsWith("image/")) return cb(null, true);
      return cb(new Error("Photo must be an image file"));
    }

    if (file.fieldname === "proof") {
      if (mime.startsWith("image/") || mime === "application/pdf") return cb(null, true);
      return cb(new Error("Proof must be an image or PDF"));
    }

    return cb(new Error("Unexpected file field"));
  },
});

const maybeUploadLoanFiles = (req, res, next) => {
  const contentType = (req.headers["content-type"] || "").toLowerCase();
  if (contentType.includes("multipart/form-data")) {
    return upload.fields([{ name: "photo", maxCount: 1 }, { name: "proof", maxCount: 1 }])(req, res, next);
  }
  return next();
};

/* =======================
   LEDGER ROUTES (FIRST)
======================= */
router.get("/by-loan-no/:loanNo", async (req, res) => {
  try {
    const { loanNo } = req.params;

    const loan = await Loan.findOne({ loanNumber: loanNo });

    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }

    res.json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Get ledger by party name
router.get("/ledger/:partyName", async (req, res) => {
  try {
    const { partyName } = req.params;

    const loans = await Loan.find({ partyName });
    const collections = await Collection.find({ partyName });

    res.json({ loans, collections });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/collections/summary/:type", async (req, res) => {
  const total = await Collection.aggregate([
    { $match: { collectionType: req.params.type } },
    { $group: { _id: null, sum: { $sum: "$amount" } } }
  ]);

  res.json({ total: total[0]?.sum || 0 });
});


// Add collection entry
router.post("/collections", async (req, res) => {
  try {
    const collection = await Collection.create(req.body);
    res.status(201).json(collection);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/collections/dashboard", async (req, res) => {
  const { partyName, loanNumber, amount, collectionType } = req.body;

  const collection = await Collection.create({
    partyName,
    loanNumber,
    amount,
    collectionType
  });

  res.status(201).json(collection);
});


router.put("/collections/:id", async (req, res) => {
  const updated = await Collection.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(updated);
});


/* =======================
   LOAN CRUD ROUTES
======================= */

router.post("/", maybeUploadLoanFiles, createLoan);
router.get("/", getLoans);
router.get("/:id", getLoanById);   // 👈 keep this AFTER ledger
router.put("/:id", maybeUploadLoanFiles, updateLoan);
router.delete("/:id", deleteLoan);

export default router;
