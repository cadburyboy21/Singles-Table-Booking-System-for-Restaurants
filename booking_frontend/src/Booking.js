import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";

// Axios setup
const api = axios.create({
  baseURL: "http://localhost:5000/api", // Change if backend runs on a different port
});

// ================= Navbar =================
function Navbar() {
  return (
    <nav className="bg-red-500 text-white p-4 flex justify-between">
      <h1 className="row mt-3 text-warning">🍽️ Singles Table Booking</h1>
      <div className="flex gap-12 text-lg font-semibold">
        <Link to="/dashboard" className="hover:text-red-500">Dashboard</Link>
        <Link to="/tables" className="hover:text-red-500">Tables</Link>
        <Link to="/bookings" className="hover:text-red-500">My Bookings</Link>
        <Link to="/profile" className="hover:text-red-500">Profile</Link>
        <Link to="/login" className="hover:text-red-500">Login</Link>
        <Link to="/signup" className="hover:text-red-500">Signup</Link>
      </div>
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
      alert("Signup failed: " + err.response?.data?.message || err.message);
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
        <button type="submit" className="bg-red-500 text-white p-2 w-full btn btn-warning">Signup</button>
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
      alert("Login failed: " + err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="email" placeholder="Email" onChange={handleChange} className="border p-2 w-full" />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} className="border p-2 w-full" />
        <button type="submit" className="bg-red-500 text-white p-2 w-full btn btn-warning">Login</button>
      </form>
    </div>
  );
}

// ================= Dashboard =================
function Dashboard() {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold">Welcome to Singles Table Booking! ❤️🍲</h2>
      <p>Find a partner and book a table together!</p>
    </div>
  );
}

// ================= Tables =================
function Tables() {
  const [tables, setTables] = useState([]);
  const token = localStorage.getItem("token");

  const fetchTables = async () => {
    try {
      const res = await api.get("/tables", {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      alert(res.data.message); // ✅ tells user if waiting or booked
      fetchTables();
    } catch (err) {
      console.error("Booking error:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.statusText ||
        err.message ||
        "Booking failed!";
      alert("Booking failed: " + errorMsg);
    }
  };

  React.useEffect(() => {
    fetchTables();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-red-600 mb-4">
        🍽️ Love & Food - Book Your Table
      </h2>
      <ul className="space-y-3">
        {tables.map((t) => (
          <li
            key={t._id}
            className="border rounded-lg p-3 flex justify-between items-center shadow-md bg-pink-50"
          >
            <span>
              ❤️ Table {t.tableNumber} -{" "}
              <b
                className={
                  t.status === "available"
                    ? "text-green-600"
                    : t.status === "pending"
                      ? "text-yellow-600"
                      : "text-red-600"
                }
              >
                {t.status}
              </b>
            </span>
            {t.status !== "booked" && (
              <button
                onClick={() => bookTable(t._id)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg btn btn-warning"
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

  // fetch bookings for logged-in user
  const fetchBookings = async () => {
    try {
      const res = await api.get("/bookings/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBookings(res.data);
    } catch (err) {
      console.error("Error fetching my bookings:", err);
      alert("Failed to load bookings");
    }
  };

  // cancel booking
  const cancelBooking = async () => {
    try {
      const res = await api.post(
        "/bookings/cancel",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(res.data.message);
      fetchBookings();
    } catch (err) {
      console.error("Cancel failed:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.statusText ||
        err.message ||
        "Cancel failed!";
      alert(errorMsg);
    }
  };

  React.useEffect(() => {
    if (token) fetchBookings();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📋 My Bookings</h2>

      {bookings.length === 0 ? (
        <p className="text-gray-600">No bookings found.</p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li
              key={b._id}
              className="border rounded-lg p-3 shadow-md bg-yellow-50 flex justify-between items-center"
            >
              <div>
                <p>
                  <b>Table:</b> #{b.tableId?.tableNumber || "N/A"}
                </p>
                <p>
                  <b>Status:</b>{" "}
                  <span
                    className={
                      b.status === "pending"
                        ? "text-yellow-600"
                        : b.status === "completed"
                          ? "text-green-600"
                          : b.status === "cancelled"
                            ? "text-gray-600"
                            : "text-red-600"
                    }
                  >
                    {b.status}
                  </span>
                </p>
              </div>

              {b.status === "pending" && (
                <button
                  onClick={cancelBooking}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg btn btn-warning"
                >
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
