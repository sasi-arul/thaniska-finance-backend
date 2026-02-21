import Loan from "../models/Loan.js";
import Collection from "../models/Collection.js";
import Investment from "../models/Investment.js";
import Expense from "../models/Expense.js";

export const getStats = async (req, res) => {
  try {
    const loans = await Loan.find();

    let dailyInterest = 0;
    let totalInterest = 0;
    let pendingAmount = 0;
    let activeLoans = 0;
    let totalDisbursed = 0;
    let totalInvestment = 0;
    let totalCollection = 0;
    let totalCollectionPrincipal = 0;
    let totalCollectionInterest = 0;
    let totalAdvanceInterest = 0;


    // loans.forEach((loan) => {
    //   if (loan.status !== "closed") {
    //     activeLoans++;

    //     const principal = loan.loanAmount || loan.amount || 0;
    //     const rate = loan.interest || loan.interestRate || 0;


    //     const total = (principal * rate) / 100;
    //     const daily = total / 30;

    //     totalInterest += total;
    //     dailyInterest += daily;
    //     pendingAmount += principal;
    //   }
    // });

    loans.forEach((loan) => {
  if (loan.status !== "closed") {
    activeLoans++;

    const principal = loan.loanAmount || 0;
    const rate = loan.interestRate || loan.interest || 0;

    //  totalInvestment += loan.disbursedAmount || principal;

    // If new system fields exist → use them
    if (loan.totalInterest && loan.totalPayable) {
      
      pendingAmount += loan.amount || loan.loanAmount || 0;

      totalDisbursed += loan.disbursedAmount || 0;


      if (loan.collectionType === "daily") {
        dailyInterest += loan.totalInterest / loan.duration;
      }

      if (loan.collectionType === "weekly") {
        dailyInterest += (loan.totalInterest / loan.duration) / 7;
      }

      totalInterest += loan.totalInterest;
    } else {
      // Fallback to old calculation (so old loans still work)
      const total = (principal * rate) / 100;
      const daily = total / 30;

      totalInterest += total;
      dailyInterest += daily;
      pendingAmount += principal;
    }
  }

  totalAdvanceInterest += Number(loan.advanceInterest || 0);
});
// ✅ TOTAL COLLECTION (sum of all collections)
const collectionData = await Collection.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: "$amount" },
      totalPrincipal: { $sum: { $ifNull: ["$principalPaid", 0] } },
      totalInterest: { $sum: { $ifNull: ["$interestPaid", 0] } }
    }
  }
]);

if (collectionData.length > 0) {
  totalCollection = collectionData[0].total || 0;
  totalCollectionPrincipal = collectionData[0].totalPrincipal || 0;
  totalCollectionInterest = collectionData[0].totalInterest || 0;
}

  // ✅ TOTAL INVESTED CAPITAL (OWNER + REINVESTMENT)
    const investmentData = await Investment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const capitalAdded =
      investmentData.length > 0 ? investmentData[0].total : 0;

    // ✅ TOTAL EXPENSES
    const expenseData = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const totalExpense =
      expenseData.length > 0 ? expenseData[0].total : 0;

    // ✅ BUSINESS METRICS
    const grossProfit = totalCollection - totalDisbursed;

    // Profit based on earned interest minus expenses
    const netProfit = totalCollectionInterest - totalExpense;

    // Profit available to allocate
    const availableProfit = netProfit;

    const cashBalance =
      capitalAdded +
      totalCollection -
      totalDisbursed -
      totalExpense;


    res.json({
      dailyInterest: Math.round(dailyInterest),
      totalInterest: Math.round(totalInterest),
      activeLoans,
      pendingAmount: Math.round(pendingAmount),
      totalDisbursed: Math.round(totalDisbursed),
      totalInvestment: Math.round(capitalAdded),
      totalCollection: Math.round(totalCollection),
      totalCollectionPrincipal: Math.round(totalCollectionPrincipal),
      totalCollectionInterest: Math.round(totalCollectionInterest),
      totalAdvanceInterest: Math.round(totalAdvanceInterest),
       totalExpense: Math.round(totalExpense),
       grossProfit: Math.round(grossProfit),
      netProfit: Math.round(netProfit),
      availableProfit: Math.round(availableProfit),
      cashBalance: Math.round(cashBalance),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};
