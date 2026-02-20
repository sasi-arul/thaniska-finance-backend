import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
  {
    loanNumber: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },

    partyName: {
      type: String,
      required: true,
      trim: true,
    },

    fatherName: {
      type: String,
      trim: true,
    },

    age: {
      type: Number,
    },

    dateOfBirth: {
      type: Date,
    },

    photoUrl: {
      type: String,
      trim: true,
    },

    proofUrl: {
      type: String,
      trim: true,
    },

    proofMimeType: {
      type: String,
      trim: true,
    },

    occupation: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    mobile: {
      type: String,
      trim: true,
    },

    aadhar: {
      type: String,
      trim: true,
    },

    witnessMobile: {
      type: String,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
    },
    advanceInterest: {
      type: Number,
      default: 0
    },

    disbursedAmount: {
      type: Number
    },

    realProfit: {
      type: Number
    },

    date: {
      type: Date,
      required: true,
    },

    // 🔥 THIS IS THE KEY FIELD
    collectionType: {
      type: String,
      enum: ["daily", "weekly", "monthly", "fire"],
      required: true,
      default: "daily",
    },
    duration: {
  type: Number,
  required: true,
},

interestRate: {
  type: Number,
  required: true,
},

totalInterest: Number,
principalPaid: { type: Number, default: 0 },
interestCollected: { type: Number, default: 0 },

totalPayable: Number,
installmentAmount: Number,
status: {
  type: String,
  enum: ["active", "closed"],
  default: "active",
},

  },
  
  {
    timestamps: true,
  }
);

const Loan = mongoose.model("Loan", loanSchema);

export default Loan;
