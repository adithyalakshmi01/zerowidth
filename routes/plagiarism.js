const express = require("express");
const multer = require("multer");
const router = express.Router();

// Configure Multer
const upload = multer({ dest: "uploads/" });

// Plagiarism Checking Route
router.post("/", upload.array("files", 2), async (req, res) => {
    try {
        const db = req.db; // Use the shared database connection
        const files = req.files;

        if (files.length < 2) {
            return res.status(400).send("Please upload two files for comparison.");
        }

        // Fetch data from DB
        const file1 = await db.collection("files").findOne({ filename: files[0].filename });
        const file2 = await db.collection("files").findOne({ filename: files[1].filename });

        if (!file1 || !file2) {
            return res.status(404).send("One or both files not found in database.");
        }

        // Simple text-based plagiarism check (can be improved with NLP)
        const similarity = Math.random() * 100; // Simulated percentage
        res.render("plagiarism", { similarity: similarity.toFixed(2) });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
