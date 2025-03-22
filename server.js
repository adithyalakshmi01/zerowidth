require("dotenv").config(); // Load environment variables
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");

// Import Routes
const embedRoutes = require("./routes/embed");
const plagiarismRoutes = require("./routes/plagiarism");
const integrityRoutes = require("./routes/integrity");
const downloadRoutes = require("./routes/download");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB (Single Connection)
const mongoURI = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

let db;
MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db(dbName);
        app.locals.db = db; // Store in app.locals for access in routes
        console.log("✅ Connected to MongoDB");
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1);
    });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// Routes (Pass db to each route)
app.use("/embed", (req, res, next) => { req.db = db; next(); }, embedRoutes);
app.use("/plagiarism", (req, res, next) => { req.db = db; next(); }, plagiarismRoutes);
app.use("/integrity", (req, res, next) => { req.db = db; next(); }, integrityRoutes);
app.use("/download", (req, res, next) => { req.db = db; next(); }, downloadRoutes);

// Home Route
app.get("/", (req, res) => {
    res.render("index");
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
