const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  originalFilename: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  watermarkId: {
    type: String,
    required: true,
    unique: true
  },
  watermarkText: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  content: {
    type: String,
    required: true
  },
  watermarkedContent: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Document', DocumentSchema);