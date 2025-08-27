/**
 * Singles Table Booking System – Backend (MERN)
 * Tech: Node.js, Express, MongoDB, JWT, Bcrypt
 * 
 * Run:
 *   npm init -y
 *   npm i express mongoose jsonwebtoken bcryptjs cors morgan dotenv
 *   node server.js
 */

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ---------------- DB Connection ----------------
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/singles_booking")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const { Schema, model, Types } = mongoose;

// ---------------- Models ----------------
const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    phone: { type: String },
    activeBookingId: { type: Types.ObjectId, ref: "Booking", default: null },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const TableSchema = new Schema(
  {
    tableNumber: { type: Number, required: true, unique: true },
    status: { type: String, enum: ["available", "pending", "booked"], default: "available" },
    currentBookings: [{ type: Types.ObjectId, ref: "Booking" }],
  },
  { timestamps: true }
);

const BookingSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  gender: { type: String, enum: ["male", "female"], required: true },
  status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
  createdAt: { type: Date, default: Date.now }
});


BookingSchema.index({ tableId: 1, userId: 1 }, { unique: true });

const User = model("User", UserSchema);
const Table = model("Table", TableSchema);
const Booking = model("Booking", BookingSchema);

// ---------------- Middleware ----------------
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

function signToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET || "devsecret", { expiresIn: "7d" });
}

// ---------------- Helpers ----------------
async function notifyUsers(userIds, message) {
  console.log("📣 Notify:", userIds.map(String), "->", message);
}

async function seedTables() {
  const count = await Table.countDocuments();
  if (count === 0) {
    await Table.insertMany([...Array(10)].map((_, i) => ({ tableNumber: i + 1 })));
    console.log("🪑 Seeded 10 tables");
  }
}
seedTables();

// ---------------- Routes ----------------
app.get("/", (req, res) => res.json({ status: "ok", service: "Singles Table Booking API" }));

// --- Auth ---
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, gender } = req.body;
    if (!name || !email || !password || !gender) return res.status(400).json({ message: "All fields required" });
    if (!["male", "female"].includes(gender)) return res.status(400).json({ message: "Invalid gender" });

    if (await User.findOne({ email })) return res.status(409).json({ message: "Email already in use" });

    const user = await User.create({ name, email, password, gender });
    res.status(201).json({ token: signToken(user), user: { id: user._id, name, email, gender } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Invalid credentials" });
    res.json({ token: signToken(user), user: { id: user._id, name: user.name, email, gender: user.gender, phone: user.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

// --- Users ---
app.get("/api/users/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).populate({ path: "activeBookingId", populate: "tableId" });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

app.patch("/api/users/me", auth, async (req, res) => {
  const updates = (({ name, phone }) => ({ name, phone }))(req.body);
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
  res.json(user);
});

// --- Tables ---
app.get("/api/tables", auth, async (req, res) => {
  const tables = await Table.find().sort("tableNumber").populate("currentBookings");
  res.json(tables);
});

// --- Bookings ---
app.get("/api/bookings/me", auth, async (req, res) => {
  const bookings = await Booking.find({ userId: req.user.id }).sort("-createdAt").populate("tableId");
  res.json(bookings);
});

app.post("/api/bookings", auth, async (req, res) => {
  try {
    const { tableId } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ prevent duplicate booking
    if (user.activeBookingId) {
      return res.status(400).json({ message: "You already have an active booking" });
    }

    const table = await Table.findById(tableId).populate("currentBookings");
    if (!table) return res.status(404).json({ message: "Table not found" });

    // ✅ check table status
    if (table.status === "booked") {
      return res.status(400).json({ message: "This table is already booked" });
    }

    // ✅ check gender restriction
    const existingBookings = table.currentBookings.filter(b => b.status !== "cancelled");
    if (existingBookings.some(b => b.gender === user.gender)) {
      return res.status(400).json({ message: `This table already has a ${user.gender}` });
    }

    if (existingBookings.length >= 2) {
      return res.status(400).json({ message: "Table is full" });
    }

    // ✅ create booking
    const booking = await Booking.create({
      tableId,
      userId: user._id,
      gender: user.gender
    });

    user.activeBookingId = booking._id;
    await user.save();

    table.currentBookings.push(booking._id);

    // ✅ check for pair
    const bookings = await Booking.find({ _id: { $in: table.currentBookings }, status: "active" });
    const hasMale = bookings.some(b => b.gender === "male");
    const hasFemale = bookings.some(b => b.gender === "female");

    if (hasMale && hasFemale && bookings.length === 2) {
      table.status = "booked";
      await Booking.updateMany(
        { _id: { $in: bookings.map(b => b._id) } },
        { $set: { status: "completed" } }
      );
      await notifyUsers(
        bookings.map(b => b.userId),
        `🎉 Your table #${table.tableNumber} is successfully booked!`
      );
      await table.save();

      return res.status(201).json({
        message: "Pair completed! Your table is booked 🎉",
        booking,
        tableStatus: "booked"
      });
    } else {
      table.status = "pending";
      await table.save();

      return res.status(201).json({
        message: "Waiting for a pair... 👤",
        booking,
        tableStatus: "pending"
      });
    }
  } catch (err) {
    console.error("Booking Error:", err);
    res.status(500).json({ message: "Booking failed" });
  }
});


// ---------------- Start Server ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running: http://localhost:${PORT}`));
