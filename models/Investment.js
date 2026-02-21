import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    source: {
      type: String,
      enum: [
        "owner",
        "reinvest",
        "reinvest_profit",
        "reinvest_collection_principal",
        "reinvest_collection_interest",
        "reinvest_advance_interest_deduction",
      ],
      default: "owner",
    },
    note: String,
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Investment", investmentSchema);
