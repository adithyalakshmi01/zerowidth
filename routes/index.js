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

// Home page
router.get('/', (req, res) => {
  res.render('index');
});

// Embed watermark page
router.get('/embed', (req, res) => {
  res.render('embed');
});

// Verify watermark page
router.get('/verify', (req, res) => {
  res.render('verify');
});

// Plagiarism check page
router.get('/check-plagiarism', (req, res) => {
  res.render('check-plagiarism');
});

// Handle file upload for embedding watermark
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
    
    // Create watermarked file
    const watermarkedFilename = `watermarked-${file.originalname}`;
    const watermarkedPath = path.join(__dirname, '../uploads', watermarkedFilename);
    fs.writeFileSync(watermarkedPath, watermarkedContent);
    
    res.render('embed', { 
      success: true,
      watermarkId,
      watermarkText,
      downloadPath: `/download/${watermarkId}` 
    });
  } catch (error) {
    console.error('Error embedding watermark:', error);
    res.render('embed', { error: 'Failed to embed watermark' });
  }
});

// Download watermarked file
router.get('/download/:id', async (req, res) => {
  try {
    const document = await Document.findOne({ watermarkId: req.params.id });
    if (!document) {
      return res.status(404).send('Document not found');
    }
    
    res.set('Content-Type', document.contentType);
    res.set('Content-Disposition', `attachment; filename=watermarked-${document.originalFilename}`);
    res.send(document.watermarkedContent);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).send('Error downloading file');
  }
});

// Verify watermarked file
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
    
    res.render('verify', {
      verified: !!extractedWatermark,
      watermarkText: extractedWatermark,
      document: document
    });
  } catch (error) {
    console.error('Error verifying watermark:', error);
    res.render('verify', { error: 'Failed to verify watermark' });
  }
});

// Check plagiarism
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
    
    // Filter to significant matches (e.g., similarity > 20%)
    const significantMatches = results.filter(r => r.similarityScore > 0.2);
    
    res.render('check-plagiarism', {
      results: significantMatches,
      totalMatches: significantMatches.length,
      highestMatch: significantMatches.length > 0 ? significantMatches[0] : null
    });
  } catch (error) {
    console.error('Error checking plagiarism:', error);
    res.render('check-plagiarism', { error: 'Failed to check plagiarism' });
  }
});

module.exports = router;