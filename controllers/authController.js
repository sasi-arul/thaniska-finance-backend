import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const getJwtSecret = () => process.env.JWT_SECRET || "thaniska_secret_key_123";

const getDefaultAdminUsername = () => process.env.ADMIN_USERNAME || "admin";
const getDefaultAdminPassword = () => process.env.ADMIN_PASSWORD || "admin123";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ensureDefaultAdmin = async () => {
  const username = getDefaultAdminUsername().trim();
  if (!username) return;

  const existing = await Admin.findOne({
    username: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") },
  });
  if (!existing) {
    const passwordHash = await bcrypt.hash(getDefaultAdminPassword(), 10);
    await Admin.create({
      username,
      passwordHash,
    });
  }
};

export const login = async (req, res) => {
  try {
    await ensureDefaultAdmin();

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const normalizedUsername = username.trim();
    const admin = await Admin.findOne({
      username: { $regex: new RegExp(`^${escapeRegex(normalizedUsername)}$`, "i") },
    });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: admin._id.toString(), username: admin.username, role: "admin" },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: { username: admin.username },
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const admin = await Admin.findById(req.user.userId);
    if (!admin) {
      return res.status(404).json({ message: "User not found" });
    }

    const validCurrent = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!validCurrent) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();

    return res.json({ message: "Password changed successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to change password", error: error.message });
  }
};
