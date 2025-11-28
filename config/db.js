const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: "taskmanager"
        });
        console.log("✅ MongoDB Connected Successfully");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1); // Stop server if DB fails
    }
};

// event listeners for debugging
mongoose.connection.on("connected", () => console.log("📡 Mongoose connected to DB"));
mongoose.connection.on("error", err => console.error("⚠️ Mongoose connection error:", err));
mongoose.connection.on("disconnected", () => console.log("🔌 Mongoose disconnected"));

module.exports = { connectDB };
