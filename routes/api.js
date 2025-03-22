const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const { embedWatermark, extractWatermark } = require('../utils/zeroWidthEncoder');
const { checkPlagiarism } = require('../utils/plagiarismChecker');
const PDFParser = require('pdf-parse');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// API to embed watermark
router.post('/embed', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const watermarkText = req.body.watermarkText || `Author: ${req.body.author || 'Unknown'}`;
    const watermarkId = uuidv4();
    
    // Read file content
    let content = '';
    const filePath = file.path;
    
    if (file.mimetype === 'application/pdf') {
      // Parse PDF
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await PDFParser(dataBuffer);
      content = pdfData.text;
    } else {
      // Assume text file
      content = fs.readFileSync(filePath, 'utf8');
    }
    
    // Embed watermark
    const watermarkedContent = embedWatermark(content, watermarkText);
    
    // Save to database
    const document = new Document({
      originalFilename: file.originalname,
      contentType: file.mimetype,
      watermarkId,
      watermarkText,
      content,
      watermarkedContent
    });
    
    await document.save();
    
    res.json({
      success: true,
      watermarkId,
      watermarkText,
      downloadUrl: `/api/download/${watermarkId}`
    });
  } catch (error) {
    console.error('API - Error embedding watermark:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to embed watermark' 
    });
  }
});

// API to verify watermark
router.post('/verify', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    
    // Read file content
    let content = '';
    const filePath = file.path;
    
    if (file.mimetype === 'application/pdf') {
      // Parse PDF
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await PDFParser(dataBuffer);
      content = pdfData.text;
    } else {
      // Assume text file
      content = fs.readFileSync(filePath, 'utf8');
    }
    
    // Extract watermark
    const extractedWatermark = extractWatermark(content);
    
    let document = null;
    if (extractedWatermark) {
      // Try to find the document in database
      document = await Document.findOne({ watermarkText: extractedWatermark });
    }
    
    res.json({
      success: true,
      verified: !!extractedWatermark,
      watermarkText: extractedWatermark,
      document: document ? {
        id: document._id,
        filename: document.originalFilename,
        uploadDate: document.uploadDate
      } : null
    });
  } catch (error) {
    console.error('API - Error verifying watermark:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify watermark' 
    });
  }
});

// API to check plagiarism
router.post('/check-plagiarism', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    
    // Read file content
    let content = '';
    const filePath = file.path;
    
    if (file.mimetype === 'application/pdf') {
      // Parse PDF
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await PDFParser(dataBuffer);
      content = pdfData.text;
    } else {
      // Assume text file
      content = fs.readFileSync(filePath, 'utf8');
    }
    
    // Check for plagiarism
    const results = await checkPlagiarism(content);
    
    res.json({
      success: true,
      results: results.filter(r => r.similarityScore > 0.1) // Only return meaningful matches
    });
  } catch (error) {
    console.error('API - Error checking plagiarism:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check plagiarism' 
    });
  }
});

// API to download watermarked file
router.get('/download/:id', async (req, res) => {
  try {
    const document = await Document.findOne({ watermarkId: req.params.id });
    if (!document) {
      return res.status(404).json({ 
        success: false, 
        error: 'Document not found' 
      });
    }
    
    res.set('Content-Type', document.contentType);
    res.set('Content-Disposition', `attachment; filename=watermarked-${document.originalFilename}`);
    res.send(document.watermarkedContent);
  } catch (error) {
    console.error('API - Error downloading file:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error downloading file' 
    });
  }
});

module.exports = router;