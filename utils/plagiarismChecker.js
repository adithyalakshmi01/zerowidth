/**
 * Simple plagiarism checker
 * Compares document similarity based on text chunks
 */

// Function to normalize text for comparison
function normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')  // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }
  
  // Split text into chunks for comparison
  function getTextChunks(text, chunkSize = 5) {
    const words = normalizeText(text).split(' ');
    const chunks = [];
    
    for (let i = 0; i <= words.length - chunkSize; i++) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    
    return chunks;
  }
  
  // Calculate Jaccard similarity between two sets
  function jaccardSimilarity(set1, set2) {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
  
  // Check text similarity against a database of documents
  async function checkPlagiarism(text, documents) {
    const Document = require('../models/Document');
    const results = [];
    
    // Get chunks from the submitted text
    const textChunks = getTextChunks(text);
    const textChunksSet = new Set(textChunks);
    
    // If no specific documents provided, query the database
    if (!documents || documents.length === 0) {
      documents = await Document.find({});
    }
    
    // Compare with each document
    for (const doc of documents) {
      const docChunks = getTextChunks(doc.content);
      const docChunksSet = new Set(docChunks);
      
      // Calculate similarity
      const similarity = jaccardSimilarity(textChunksSet, docChunksSet);
      
      // Find matching chunks for evidence
      const matchingChunks = [...textChunksSet].filter(chunk => docChunksSet.has(chunk));
      
      results.push({
        documentId: doc._id,
        documentName: doc.originalFilename,
        similarityScore: similarity,
        matchingChunks: matchingChunks.slice(0, 5)  // Limit to 5 examples
      });
    }
    
    // Sort by similarity score (highest first)
    return results.sort((a, b) => b.similarityScore - a.similarityScore);
  }
  
  module.exports = {
    checkPlagiarism,
    getTextChunks,
    jaccardSimilarity
  };