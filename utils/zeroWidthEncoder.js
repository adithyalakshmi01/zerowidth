/**
 * PDF and text watermarking utility using zero-width characters
 * Handles both PDF and text files with proper MIME type checking
 */
const fs = require('fs');
const pdfParse = require('pdf-parse');
const path = require('path');
const mime = require('mime-types'); // You may need to install this: npm install mime-types

// Zero-width characters we'll use
const ZWC = {
  ZERO_WIDTH_SPACE: '\u200B',
  ZERO_WIDTH_NON_JOINER: '\u200C',
  ZERO_WIDTH_JOINER: '\u200D',
  ZERO_WIDTH_NO_BREAK_SPACE: '\uFEFF'
};

// Convert text to binary
function textToBinary(text) {
  return text.split('').map(char => {
    const binary = char.charCodeAt(0).toString(2);
    return binary.padStart(8, '0');
  }).join('');
}

// Convert binary to text
function binaryToText(binary) {
  const chunks = binary.match(/.{1,8}/g) || [];
  return chunks.map(chunk => {
    return String.fromCharCode(parseInt(chunk, 2));
  }).join('');
}

// Encode binary as zero-width characters
function binaryToZeroWidth(binary) {
  return binary.split('').map(bit => {
    return bit === '0' ? ZWC.ZERO_WIDTH_SPACE : ZWC.ZERO_WIDTH_NON_JOINER;
  }).join(ZWC.ZERO_WIDTH_JOINER);
}

// Decode zero-width characters to binary
function zeroWidthToBinary(zeroWidth) {
  const parts = zeroWidth.split(ZWC.ZERO_WIDTH_JOINER);
  return parts.map(char => {
    return char === ZWC.ZERO_WIDTH_SPACE ? '0' : '1';
  }).join('');
}

// Embed watermark into text
function embedWatermark(text, watermark) {
  const binaryWatermark = textToBinary(watermark);
  const zeroWidthWatermark = binaryToZeroWidth(binaryWatermark);

  // Add the watermark at various points in the text
  // We'll insert after paragraph markers to avoid detection
  const paragraphs = text.split(/\n\s*\n/);
  let watermarkedText = "";
    
  paragraphs.forEach((paragraph, index) => {
    watermarkedText += paragraph;
    if (index < paragraphs.length - 1) {
      watermarkedText += "\n\n" + zeroWidthWatermark;
    }
  });
    
  // If there aren't enough paragraph breaks, add watermark at the end
  if (paragraphs.length <= 1) {
    watermarkedText += zeroWidthWatermark;
  }
    
  return watermarkedText;
}

// Extract watermark from text
function extractWatermark(watermarkedText) {
  // Regular expression to find sequences of zero-width characters
  const zwcRegex = new RegExp(
    `[${ZWC.ZERO_WIDTH_SPACE}${ZWC.ZERO_WIDTH_NON_JOINER}${ZWC.ZERO_WIDTH_JOINER}]+`, 
    'g'
  );
    
  const matches = watermarkedText.match(zwcRegex);
  if (!matches || matches.length === 0) {
    return null;
  }
    
  // Use the first match (or we could combine all matches)
  const zeroWidthSequence = matches[0];
  const binaryWatermark = zeroWidthToBinary(zeroWidthSequence);
    
  try {
    return binaryToText(binaryWatermark);
  } catch (error) {
    console.error("Failed to decode watermark:", error);
    return null;
  }
}

// Detect file type and process accordingly
async function processFile(filePath, watermark) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Get file extension and mime type
    const extension = path.extname(filePath).toLowerCase();
    const mimeType = mime.lookup(filePath) || 'application/octet-stream';
    
    console.log(`Processing file: ${filePath}`);
    console.log(`Detected MIME type: ${mimeType}`);
    
    let text;
    
    // Process based on file type
    if (mimeType === 'application/pdf' || extension === '.pdf') {
      // Handle PDF files
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      text = data.text;
      console.log('Successfully extracted text from PDF');
    } else if (mimeType === 'text/plain' || extension === '.txt') {
      // Handle text files
      text = fs.readFileSync(filePath, 'utf8');
      console.log('Successfully read text file');
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
    
    // Apply watermark to the text
    const watermarkedText = embedWatermark(text, watermark);
    
    return {
      originalText: text,
      watermarkedText: watermarkedText,
      mimeType: mimeType
    };
  } catch (error) {
    console.error("Error processing file:", error);
    throw error;
  }
}

// Save watermarked text to file
function saveWatermarkedText(text, outputPath) {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, text);
    console.log(`Watermarked text saved to: ${outputPath}`);
    return true;
  } catch (error) {
    console.error("Error saving watermarked text:", error);
    throw error;
  }
}

// Main function to watermark a file
async function watermarkFile(filePath, watermark, outputPath) {
  try {
    console.log(`Processing file: ${filePath}`);
    console.log(`Applying watermark: "${watermark}"`);
    
    const result = await processFile(filePath, watermark);
    saveWatermarkedText(result.watermarkedText, outputPath);
    
    console.log(`Watermarking complete!`);
    return result;
  } catch (error) {
    console.error("Failed to watermark file:", error);
    return null;
  }
}

// If this module is being run directly
if (require.main === module) {
  // Get command line arguments
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: node watermark.js <input-file> <watermark> <output-file>');
    process.exit(1);
  }
  
  const [inputFile, watermark, outputFile] = args;
  
  watermarkFile(inputFile, watermark, outputFile)
    .then(() => {
      console.log('Watermarking process completed successfully.');
    })
    .catch(err => {
      console.error('Watermarking process failed:', err);
      process.exit(1);
    });
}

module.exports = {
  embedWatermark,
  extractWatermark,
  processFile,
  saveWatermarkedText,
  watermarkFile
};