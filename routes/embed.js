const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();

// Configure Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });

// File Embedding Route
router.post("/", upload.single("file"), async (req, res) => {
    try {
        const db = req.db; // Use the shared database connection
        const fileData = {
            filename: req.file.filename,
            originalname: req.file.originalname,
            uploadedAt: new Date(),
        };
        
        const result = await db.collection("files").insertOne(fileData);
        res.render("result", { fileUrl: `/download/${req.file.filename}` });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
