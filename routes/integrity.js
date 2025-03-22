const express = require("express");
const router = express.Router();

// Integrity Checking Route
router.post("/", async (req, res) => {
    try {
        const db = req.db; // Use shared database connection
        const { filename, originalHash } = req.body;

        const fileData = await db.collection("files").findOne({ filename });

        if (!fileData) {
            return res.status(404).send("File not found.");
        }

        // Simulate hash comparison
        const storedHash = "someGeneratedHash"; // Replace with real hash computation
        const result = storedHash === originalHash ? "Valid File" : "Tampered File";

        res.render("integrity", { result });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
