const express = require("express");
const path = require("path");
const router = express.Router();

// File Download Route
router.get("/:filename", async (req, res) => {
    try {
        const db = req.db; // Use shared database connection
        const { filename } = req.params;

        const file = await db.collection("files").findOne({ filename });

        if (!file) {
            return res.status(404).send("File not found.");
        }

        const filePath = path.join(__dirname, "../uploads", filename);
        res.download(filePath);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
