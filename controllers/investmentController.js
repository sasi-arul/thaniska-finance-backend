import Investment from "../models/Investment.js";

const VALID_SOURCES = new Set([
  "owner",
  "reinvest",
  "reinvest_profit",
  "reinvest_collection_principal",
  "reinvest_collection_interest",
  "reinvest_advance_interest_deduction",
]);

const normalizeSource = (input) => {
  const value = String(input || "").trim().toLowerCase();
  if (!value) return "owner";
  if (value === "reinvestment" || value === "reinvest") return "reinvest_profit";
  if (VALID_SOURCES.has(value)) return value;
  return "owner";
};

export const addInvestment = async (req, res) => {
  try {
    const { amount, note, type, source, date } = req.body;

    const investment = new Investment({
      amount,
      note,
      source: normalizeSource(source || type),
      date,
    });

    await investment.save();
    res.status(201).json(investment);
  } catch (error) {
    res.status(500).json({ message: "Failed to add investment" });
  }
};

export const getInvestments = async (req, res) => {
  try {
    const data = await Investment.find().sort({ date: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch investments" });
  }
};

export const updateInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, note, type, source, date } = req.body;

    const updated = await Investment.findByIdAndUpdate(
      id,
      {
        amount,
        note,
        source: normalizeSource(source || type),
        date,
      },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update investment" });
  }
};

export const deleteInvestment = async (req, res) => {
  try {
    const { id } = req.params;

    await Investment.findByIdAndDelete(id);

    res.json({ message: "Investment deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete investment" });
  }
};
