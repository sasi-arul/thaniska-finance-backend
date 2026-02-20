import express from "express";
import {
  addCollection,
  getLedgerByParty,
   getCollectionByDate,
   getAllCollections,
   updateCollection,
   deleteCollection
} from "../controllers/collectionController.js";

const router = express.Router();

router.post("/", addCollection);
router.get("/ledger/:partyName", getLedgerByParty);
router.get("/report", getCollectionByDate);
router.get("/", getAllCollections);
router.put("/:id", updateCollection);
router.delete("/:id", deleteCollection);


export default router;
