const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    filename: String,
    fileHash: String,
    content: String,  // Store Zero-Width embedded text
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("File", fileSchema);
