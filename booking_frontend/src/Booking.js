import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Menu, X } from "lucide-react"; // for hamburger + close icons

// Axios setup
const api = axios.create({
  baseURL: "http://localhost:5000/api", // Change if backend runs on a different port
});

// ================= Navbar =================
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const token = localStorage.getItem("token");

  return (
    <nav className="bg-red-500 text-white p-4 flex justify-between items-center shadow-md relative">
      <h1 className="text-xl font-bold text-warning">🍽️ Singles Table Booking</h1>

      {/* Hamburger for Mobile */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden text-white"
      >
        {menuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      
      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="absolute top-16 right-4 bg-white text-warning rounded-xl shadow-lg p-4 flex flex-col gap-4 md:hidden ">
          <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
          <Link to="/tables" onClick={() => setMenuOpen(false)}>Tables</Link>
          <Link to="/bookings" onClick={() => setMenuOpen(false)}>My Bookings</Link>
          <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
          {!token ? (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)}>Signup</Link>
            </>
          ) : (
            <button
              onClick={() => {
                localStorage.removeItem("token");
                window.location.href = "/login";
              }}
            >
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

// ================= Signup =================
function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", gender: "" });
  const navigate = useNavigate();
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", form);
      alert("Signup successful!");
      navigate("/login");
    } catch (err) {
      alert("Signup failed: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Signup</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="name" placeholder="Name" onChange={handleChange} className="border p-2 w-full" />
        <input name="email" placeholder="Email" onChange={handleChange} className="border p-2 w-full" />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} className="border p-2 w-full" />
        <select name="gender" onChange={handleChange} className="border p-2 w-full">
          <option value="">Select Gender</option>
          <option value="male">Boy</option>
          <option value="female">Girl</option>
        </select>
        <button type="submit" className="bg-red-500 text-white p-2 w-full rounded-lg">Signup</button>
      </form>
    </div>
  );
}

// ================= Login =================
function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", form);
      localStorage.setItem("token", res.data.token);
      alert("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      alert("Login failed: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="email" placeholder="Email" onChange={handleChange} className="border p-2 w-full" />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} className="border p-2 w-full" />
        <button type="submit" className="bg-red-500 text-white p-2 w-full rounded-lg">Login</button>
      </form>
    </div>
  );
}

// ================= Dashboard =================
function Dashboard() {
  const [tables, setTables] = useState([]);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchTables = async () => {
    try {
      const res = await api.get("/tables", { headers: { Authorization: `Bearer ${token}` } });
      setTables(res.data);
    } catch (err) {
      console.error("Failed to fetch tables:", err);
    }
  };

  React.useEffect(() => {
    if (token) fetchTables();
  }, []);

  const totalTables = tables.length;
  const bookedTables = tables.filter((t) => t.status === "booked").length;
  const availableTables = tables.filter((t) => t.status === "available").length;

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">Welcome to Singles Table Booking! ❤️🍲</h2>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-green-100 border border-green-400 text-green-800 rounded-lg p-4 shadow-md">
          <h3 className="text-xl font-bold">✅ Total Tables</h3>
          <p className="text-2xl">{totalTables}</p>
        </div>
        <div className="bg-blue-100 border border-blue-400 text-blue-800 rounded-lg p-4 shadow-md">
          <h3 className="text-xl font-bold">🟢 Available</h3>
          <p className="text-2xl">{availableTables}</p>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-800 rounded-lg p-4 shadow-md">
          <h3 className="text-xl font-bold">🔴 Booked</h3>
          <p className="text-2xl">{bookedTables}</p>
        </div>
      </div>

      <div className="text-center mt-6">
        <button
          onClick={() => navigate("/tables")}
          className="bg-red-500 text-white px-6 py-3 rounded-xl shadow-md hover:bg-red-600 transition btn btn-warning"
        >
          🍽️ Book a Table
        </button>
      </div>
    </div>
  );
}

// ================= Tables =================
function Tables() {
  const [tables, setTables] = useState([]);
  const token = localStorage.getItem("token");

  const fetchTables = async () => {
    try {
      const res = await api.get("/tables", { headers: { Authorization: `Bearer ${token}` } });
      setTables(res.data);
    } catch (err) {
      console.error("Fetch tables failed:", err);
    }
  };

  const bookTable = async (id) => {
    if (!token) {
      alert("You must be logged in to book a table.");
      return;
    }
    try {
      const res = await api.post(
        "/bookings",
        { tableId: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(res.data.message);
      fetchTables();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Booking failed!";
      alert("Booking failed: " + errorMsg);
    }
  };

  React.useEffect(() => { fetchTables(); }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-red-600 mb-4">🍽️ Love & Food - Book Your Table</h2>
      <ul className="space-y-3">
        {tables.map((t) => (
          <li key={t._id} className="border rounded-lg p-3 flex justify-between items-center shadow-md bg-pink-50">
            <span>
              ❤️ Table {t.tableNumber} -{" "}
              <b className={t.status === "available" ? "text-green-600" : t.status === "pending" ? "text-yellow-600" : "text-red-600"}>
                {t.status}
              </b>
            </span>
            {t.status !== "booked" && (
              <button
                onClick={() => bookTable(t._id)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg"
              >
                Book
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ================= My Bookings =================
function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const token = localStorage.getItem("token");

  const fetchBookings = async () => {
    try {
      const res = await api.get("/bookings/me", { headers: { Authorization: `Bearer ${token}` } });
      setBookings(res.data);
    } catch (err) {
      alert("Failed to load bookings");
    }
  };

  const cancelBooking = async () => {
    try {
      const res = await api.post("/bookings/cancel", {}, { headers: { Authorization: `Bearer ${token}` } });
      alert(res.data.message);
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.message || "Cancel failed!");
    }
  };

  React.useEffect(() => { if (token) fetchBookings(); }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📋 My Bookings</h2>
      {bookings.length === 0 ? (
        <p className="text-gray-600">No bookings found.</p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li key={b._id} className="border rounded-lg p-3 shadow-md bg-yellow-50 flex justify-between items-center">
              <div>
                <p><b>Table:</b> #{b.tableId?.tableNumber || "N/A"}</p>
                <p>
                  <b>Status:</b>{" "}
                  <span className={b.status === "pending" ? "text-yellow-600" : b.status === "completed" ? "text-green-600" : "text-red-600"}>
                    {b.status}
                  </span>
                </p>
              </div>
              {b.status === "pending" && (
                <button onClick={cancelBooking} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg">
                  Cancel
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ================= Profile =================
function Profile() {
  const [user, setUser] = useState(null);
  const token = localStorage.getItem("token");

  React.useEffect(() => {
    api.get("/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setUser(res.data))
      .catch((err) => console.error(err));
  }, [token]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Profile</h2>
      {user ? (
        <div>
          <p><b>Name:</b> {user.name}</p>
          <p><b>Email:</b> {user.email}</p>
          <p><b>Gender:</b> {user.gender}</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

// ================= Main App =================
function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tables" element={<Tables />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Router>
  );
}

export default App;
