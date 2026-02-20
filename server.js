import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import connectDB from "./config/db.js";
import loanRoutes from "./routes/loanRoutes.js";
import collectionRoutes from "./routes/collectionRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import investmentRoutes from "./routes/investmentRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import authMiddleware from "./middleware/auth.middleware.js";


dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: "*"
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api", authMiddleware);

app.use("/api/loans", loanRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api/expenses", expenseRoutes);


app.get("/", (req, res) => {
  res.send("Thaniska Finance API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
