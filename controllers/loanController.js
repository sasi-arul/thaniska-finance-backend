import Loan from "../models/Loan.js";

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const buildFinancials = ({ amount, interestRate, duration, advanceInterest, collectionType }) => {
  const principal = toNumber(amount);
  const rate = toNumber(interestRate);
  const loanDuration = toNumber(duration);
  const advance = toNumber(advanceInterest);

  const interest = (principal * rate) / 100;
  const totalInterest = interest + advance;
  const disbursedAmount = principal - advance;
  const totalPayable = principal + interest;
  const realProfit = totalPayable - disbursedAmount;
  const isInterestOnly = collectionType === "monthly" || collectionType === "fire";
  const installmentAmount = isInterestOnly ? interest : totalPayable / loanDuration;

  return {
    principal,
    rate,
    loanDuration,
    advance,
    interest,
    totalInterest,
    disbursedAmount,
    totalPayable,
    realProfit,
    installmentAmount,
  };
};

export const createLoan = async (req, res) => {
  try {
    const photoFile = req.files?.photo?.[0];
    const proofFile = req.files?.proof?.[0];
    const body = req.body || {};

    if (!Object.keys(body).length) {
      return res.status(400).json({
        message: "Request body is missing. Send JSON or multipart/form-data with loan fields.",
      });
    }

    const {
      loanNumber,
      partyName,
      fatherName,
      age,
      dateOfBirth,
      occupation,
      address,
      mobile,
      aadhar,
      witnessMobile,
      amount,
      advanceInterest = 0,
      date,
      collectionType,
      duration,
      interestRate,
    } = body;

    const figures = buildFinancials({
      amount,
      interestRate,
      duration,
      advanceInterest,
      collectionType,
    });

    if (!figures.principal || !figures.rate || !figures.loanDuration) {
      return res.status(400).json({ message: "Invalid numeric values" });
    }

    const finalLoanNumber = loanNumber && loanNumber.trim() !== "" ? loanNumber : undefined;

    const loan = await Loan.create({
      loanNumber: finalLoanNumber,
      partyName,
      fatherName,
      age: toNumber(age, 0),
      dateOfBirth: dateOfBirth || null,
      photoUrl: photoFile ? `/uploads/loans/${photoFile.filename}` : undefined,
      proofUrl: proofFile ? `/uploads/loans/${proofFile.filename}` : undefined,
      proofMimeType: proofFile?.mimetype || undefined,
      occupation,
      address,
      mobile,
      aadhar,
      witnessMobile,
      amount: figures.principal,
      interestRate: figures.rate,
      duration: figures.loanDuration,
      advanceInterest: figures.advance,
      disbursedAmount: figures.disbursedAmount,
      totalInterest: figures.totalInterest,
      totalPayable: figures.totalPayable,
      realProfit: figures.realProfit,
      installmentAmount: figures.installmentAmount,
      collectionType,
      date,
    });

    res.status(201).json(loan);
  } catch (error) {
    console.error("CREATE LOAN ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getLoans = async (req, res) => {
  try {
    const filter = {};

    if (req.query.collectionType) {
      filter.collectionType = req.query.collectionType;
    }

    const loans = await Loan.find(filter).select(
      "_id loanNumber partyName amount collectionType date duration installmentAmount totalPayable principalPaid status interestRate photoUrl proofUrl proofMimeType"
    );

    res.json(loans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    res.json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLoan = async (req, res) => {
  try {
    const existingLoan = await Loan.findById(req.params.id);
    if (!existingLoan) return res.status(404).json({ message: "Loan not found" });

    const body = req.body || {};
    const photoFile = req.files?.photo?.[0];
    const proofFile = req.files?.proof?.[0];

    const updateData = { ...body };

    if (Object.prototype.hasOwnProperty.call(updateData, "amount")) {
      updateData.amount = toNumber(updateData.amount, 0);
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "interestRate")) {
      updateData.interestRate = toNumber(updateData.interestRate, 0);
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "duration")) {
      updateData.duration = toNumber(updateData.duration, 0);
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "advanceInterest")) {
      updateData.advanceInterest = toNumber(updateData.advanceInterest, 0);
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "age")) {
      updateData.age = toNumber(updateData.age, 0);
    }
    if (Object.prototype.hasOwnProperty.call(updateData, "dateOfBirth") && !updateData.dateOfBirth) {
      updateData.dateOfBirth = null;
    }

    if (photoFile) {
      updateData.photoUrl = `/uploads/loans/${photoFile.filename}`;
    }
    if (proofFile) {
      updateData.proofUrl = `/uploads/loans/${proofFile.filename}`;
      updateData.proofMimeType = proofFile.mimetype || undefined;
    }

    const effectiveAmount = Object.prototype.hasOwnProperty.call(updateData, "amount")
      ? updateData.amount
      : existingLoan.amount || 0;
    const effectiveRate = Object.prototype.hasOwnProperty.call(updateData, "interestRate")
      ? updateData.interestRate
      : existingLoan.interestRate || 0;
    const effectiveDuration = Object.prototype.hasOwnProperty.call(updateData, "duration")
      ? updateData.duration
      : existingLoan.duration || 0;
    const effectiveAdvance = Object.prototype.hasOwnProperty.call(updateData, "advanceInterest")
      ? updateData.advanceInterest
      : existingLoan.advanceInterest || 0;
    const effectiveCollectionType = Object.prototype.hasOwnProperty.call(updateData, "collectionType")
      ? updateData.collectionType
      : existingLoan.collectionType;

    if (effectiveAmount > 0 && effectiveRate > 0 && effectiveDuration > 0) {
      const figures = buildFinancials({
        amount: effectiveAmount,
        interestRate: effectiveRate,
        duration: effectiveDuration,
        advanceInterest: effectiveAdvance,
        collectionType: effectiveCollectionType,
      });

      updateData.totalInterest = figures.totalInterest;
      updateData.disbursedAmount = figures.disbursedAmount;
      updateData.totalPayable = figures.totalPayable;
      updateData.realProfit = figures.realProfit;
      updateData.installmentAmount = figures.installmentAmount;
    }

    const loan = await Loan.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(loan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteLoan = async (req, res) => {
  try {
    await Loan.findByIdAndDelete(req.params.id);
    res.json({ message: "Loan deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
