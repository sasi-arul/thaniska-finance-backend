import Collection from "../models/Collection.js";
import Loan from "../models/Loan.js";

const round2 = (value) => Math.round(value * 100) / 100;

const recalculateLoanFromCollections = async (loanNo) => {
  if (!loanNo) return;

  const loan = await Loan.findOne({ loanNumber: loanNo });
  if (!loan) return;

  const principalBase = Number(loan.amount || 0);
  const rate = Number(loan.interestRate || 0);
  const ratio = 1 + rate / 100;

  const collections = await Collection.find({ loanNo }).sort({ date: 1, createdAt: 1 });

  let remainingPrincipal = principalBase;
  let totalInterest = 0;
  const bulkOps = [];

  for (const entry of collections) {
    const paymentAmount = Number(entry.amount || 0);
    const isMonthlyOrFire = entry.collectionType === "monthly" || entry.collectionType === "fire";

    let principalPaid = 0;
    let interestPaid = paymentAmount;

    if (!isMonthlyOrFire && ratio > 0) {
      principalPaid = paymentAmount / ratio;
      principalPaid = Math.min(principalPaid, Math.max(remainingPrincipal, 0));
      interestPaid = paymentAmount - principalPaid;
    }

    principalPaid = round2(principalPaid);
    interestPaid = round2(interestPaid);
    remainingPrincipal = round2(Math.max(remainingPrincipal - principalPaid, 0));
    totalInterest += interestPaid;

    bulkOps.push({
      updateOne: {
        filter: { _id: entry._id },
        update: { $set: { principalPaid, interestPaid } },
      },
    });
  }

  if (bulkOps.length) {
    await Collection.bulkWrite(bulkOps);
  }

  const principalPaidTotal = round2(Math.max(principalBase - remainingPrincipal, 0));
  loan.principalPaid = principalPaidTotal;
  loan.interestCollected = round2(totalInterest);
  loan.status = principalPaidTotal >= principalBase && principalBase > 0 ? "closed" : "active";
  await loan.save();
};

export const addCollection = async (req, res) => {
  try {
    const { loanNo, partyName, amount, date, type, paymentMode } = req.body;

    const loan = await Loan.findOne({ loanNumber: loanNo });
    if (!loan) {
      return res.status(404).json({ message: "Loan not found" });
    }
    if (loan.status === "closed") {
      return res.status(400).json({ message: "Loan already closed" });
    }

    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        message: "Amount must be a valid number greater than zero",
      });
    }

    const principalBase = Number(loan.amount || loan.loanAmount || 0);
    const alreadyPaidPrincipal = Number(loan.principalPaid || 0);
    const remainingPrincipal = Math.max(principalBase - alreadyPaidPrincipal, 0);
    const rate = Number(loan.interestRate || 0);
    const ratio = 1 + rate / 100;
    const collectionType = type || loan.collectionType;
    const isMonthly = collectionType === "monthly";
    const isFire = collectionType === "fire";
    const isCloseMode = paymentMode === "close";

    let principalPaid = paymentAmount;
    let interestPaid = 0;

    if (isCloseMode) {
      if (paymentAmount < remainingPrincipal) {
        return res.status(400).json({
          message: `Closing amount must be at least remaining principal: ${round2(remainingPrincipal)}`,
        });
      }

      principalPaid = remainingPrincipal;
      interestPaid = paymentAmount - remainingPrincipal;
    } else if (isMonthly || isFire) {
      principalPaid = 0;
      interestPaid = paymentAmount;
    } else if (ratio > 0) {
      principalPaid = paymentAmount / ratio;
      interestPaid = paymentAmount - principalPaid;
    }

    principalPaid = Math.min(principalPaid, remainingPrincipal);
    interestPaid = paymentAmount - principalPaid;
    principalPaid = round2(principalPaid);
    interestPaid = round2(interestPaid);

    loan.principalPaid = alreadyPaidPrincipal + principalPaid;
    loan.interestCollected = Number(loan.interestCollected || 0) + interestPaid;

    if (principalBase > 0 && loan.principalPaid >= principalBase) {
      loan.status = "closed";
    }

    await loan.save();

    const collection = await Collection.create({
      loanNo,
      partyName: (partyName || loan.partyName || "").trim().toLowerCase(),
      amount: paymentAmount,
      date,
      collectionType,
      principalPaid,
      interestPaid,
    });

    res.status(201).json(collection);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getLedgerByParty = async (req, res) => {
  try {
    const partyName = req.params.partyName.trim();

    const collections = await Collection.find({
      partyName: { $regex: new RegExp(`^${partyName}$`, "i") },
    }).sort({ date: 1 });

    const loan = await Loan.findOne({
      partyName: { $regex: new RegExp(`^${partyName}$`, "i") },
    });

    if (!loan) {
      return res.json({
        collections,
        summary: null,
      });
    }

    const totalPaid = round2(collections.reduce((sum, item) => sum + Number(item.amount || 0), 0));

    const principal = Number(loan.amount || 0);
    const rate = Number(loan.interestRate || 0);
    const remainingPrincipal = round2(Math.max(principal - Number(loan.principalPaid || 0), 0));
    const periodicInterest = round2((remainingPrincipal * rate) / 100);
    const isInterestOnly = loan.collectionType === "monthly" || loan.collectionType === "fire";

    const totalPayable = isInterestOnly
      ? round2(remainingPrincipal + periodicInterest)
      : round2(loan.totalPayable || principal + Number(loan.totalInterest || 0));

    const remainingBalance = isInterestOnly
      ? (loan.status === "closed" ? 0 : totalPayable)
      : round2(Math.max(totalPayable - totalPaid, 0));

    const installmentAmount = isInterestOnly
      ? periodicInterest
      : round2(Number(loan.installmentAmount || 0));

    res.json({
      collections,
      summary: {
        loanAmount: loan.disbursedAmount,
        totalPayable,
        totalPaid,
        remainingBalance,
        collectionType: loan.collectionType,
        installmentAmount,
      },
    });
  } catch (error) {
    console.error("Ledger Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getCollectionByDate = async (req, res) => {
  try {
    const { date, loanNo } = req.query;

    if (!date && !loanNo) {
      return res.status(400).json({
        message: "Date or Loan Number is required",
      });
    }

    const filter = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      filter.date = { $gte: start, $lte: end };
    }

    if (loanNo) {
      filter.loanNo = loanNo;
    }

    const collections = await Collection.find(filter).sort({ createdAt: -1 });
    const total = collections.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      collections,
      total,
    });
  } catch (error) {
    console.error("REPORT ERROR:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

export const getAllCollections = async (req, res) => {
  try {
    const collections = await Collection.find().sort({ createdAt: -1 });
    const total = collections.reduce((sum, item) => sum + item.amount, 0);

    res.json({ collections, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    const { amount, date } = req.body;

    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than zero" });
      }
      collection.amount = numericAmount;
    }

    if (date) {
      collection.date = new Date(date);
    }

    await collection.save();
    await recalculateLoanFromCollections(collection.loanNo);

    return res.json(collection);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    const loanNo = collection.loanNo;
    await Collection.findByIdAndDelete(req.params.id);
    await recalculateLoanFromCollections(loanNo);

    return res.json({ message: "Collection deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
