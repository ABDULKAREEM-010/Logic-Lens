const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const multer = require("multer");
const execAsync = util.promisify(exec);
const { reviewWithGemini } = require("../utils/geminiReview");  
const analyzeJavaScript = require("../utils/analyzeJS");
const analyzeJava = require("../utils/analyzeJava");
const analyzeCpp = require("../utils/analyzeCpp");

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Temp folder for uploaded files
const TEMP_DIR = path.join(__dirname, "../temp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

// Multer setup
const upload = multer({ dest: TEMP_DIR });

// Helper: fetch past rejected suggestions
async function getRejectionComments(code, language) {
  try {
    const { data, error } = await supabase
      .from("feedback")
      .select("comment, suggestion")
      .eq("language", language)
      .eq("code", code)
      .eq("decision", "reject");

    if (error) return [];
    return data.filter(d => d.comment?.trim())
               .map(d => `• Previously, "${d.suggestion}" was rejected because: "${d.comment}"`);
  } catch (err) {
    console.error("Supabase fetch error:", err);
    return [];
  }
}

// Language detection helper (used in both routes)
const detectLanguage = (filename) => {
  const ext = path.extname(filename).toLowerCase().slice(1);  // e.g., 'js', 'py'
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return 'javascript';
  if (ext === 'py') return 'python';
  if (ext === 'java') return 'java';
  if (['c', 'cpp', 'h'].includes(ext)) return ext === 'c' ? 'c' : 'cpp';
  return null;  // Unsupported
};

// Unified single-file analysis helper
async function processSingleFileAnalysis(code, language, rejectionComments = []) {
  let staticSuggestions = [];
  let geminiResult = { rawReview: 'Gemini analysis unavailable', suggestions: [] };

  try {
    console.log(`=== STARTING ANALYSIS FOR ${language} ===`);

    // Static analysis branches
    if (language === "python") {
      const tempFile = path.join(TEMP_DIR, "temp.py");
      fs.writeFileSync(tempFile, code);

      const { stdout, stderr } = await execAsync(`python python/analyze_python.py "${tempFile}"`, { cwd: __dirname });
      console.log("Python STDOUT:", stdout);
      console.log("Python STDERR:", stderr);

      staticSuggestions = JSON.parse(stdout || "[]");
      fs.unlinkSync(tempFile);  // Cleanup

    } else if (language === "javascript") {
      staticSuggestions = await analyzeJavaScript(code);

    } else if (language === "java") {
      staticSuggestions = await analyzeJava(code);

    } else if (language === "cpp" || language === "c") {
      const ext = language === "c" ? "c" : "cpp";
      staticSuggestions = await analyzeCpp(code, ext);

    } else {
      console.warn(`Unsupported language: ${language}`);
      staticSuggestions = [];
    }

    // ALWAYS call Gemini for review
    console.log(`=== CALLING GEMINI FOR ${language} ===`);
    geminiResult = await reviewWithGemini(code, language, rejectionComments);
    console.log(`=== GEMINI RESULT FOR ${language} ===`, { 
      rawReviewPreview: geminiResult.rawReview?.substring(0, 100) + '...',
      rawReviewLength: geminiResult.rawReview?.length || 0,
      suggestionsCount: geminiResult.suggestions?.length || 0
    });

  } catch (err) {
    console.error(`Analysis failed for ${language}:`, err);
    geminiResult = { rawReview: `Error during analysis: ${err.message}`, suggestions: [] };
  }

  // FIXED: Merge static suggestions with Gemini suggestions properly
  // Keep them separate in structure but combine for total count
  const allSuggestions = [...staticSuggestions, ...geminiResult.suggestions];

  console.log(`=== FINAL ANALYSIS STRUCTURE FOR ${language} ===`, {
    staticCount: staticSuggestions.length,
    geminiSuggestionsCount: geminiResult.suggestions.length,
    totalSuggestions: allSuggestions.length,
    geminiRawReviewLength: geminiResult.rawReview?.length || 0
  });

  return {
    suggestions: allSuggestions,           // All suggestions combined
    geminiReview: geminiResult             // Separate Gemini review structure
  };
}

// --------------------- SINGLE FILE ANALYSIS ---------------------
router.post("/", async (req, res) => {
  const { language, code } = req.body;
  if (!language || !code) return res.status(400).json({ error: "Missing code or language" });

  const rejectionComments = await getRejectionComments(code, language);

  try {
    const analysis = await processSingleFileAnalysis(code, language, rejectionComments);

    console.log(`=== SINGLE-FILE RESPONSE STRUCTURE FOR ${language} ===`, {
      hasGeminiReview: !!analysis.geminiReview,
      geminiRawReviewExists: !!analysis.geminiReview.rawReview && analysis.geminiReview.rawReview !== 'Gemini analysis unavailable',
      suggestionsCount: analysis.suggestions.length,
      geminiSuggestionsCount: analysis.geminiReview.suggestions.length,
      responseKeys: Object.keys(analysis)
    });

    // Send the exact structure that the frontend expects
    res.json(analysis);

  } catch (err) {
    console.error("Single-file analysis failed:", err);
    res.status(500).json({ 
      error: "Analysis failed", 
      suggestions: [], 
      geminiReview: { rawReview: err.message, suggestions: [] } 
    });
  }
});

// --------------------- MULTI-FILE ANALYSIS ---------------------
router.post("/multi", upload.array("files"), async (req, res) => {
  console.log('=== MULTI-FILE REQUEST RECEIVED ===', { fileCount: req.files?.length });
  // Debug: log any paths metadata the client may have sent
  if (req.body && req.body.paths) {
    console.log('=== MULTI-FILE PATHS RECEIVED ===', req.body.paths.substring(0, 200));
  }
  
  if (!req.files || !req.files.length) {
    console.error('=== NO FILES IN REQUEST ===');
    return res.status(400).json({ error: "No files uploaded" });
  }

  console.log('=== FILES RECEIVED ===', req.files.map(f => ({
    originalname: f.originalname,
    size: f.size,
    mimetype: f.mimetype
  })));

  const results = [];

  for (const file of req.files) {
    console.log(`=== Processing file: ${file.originalname} ===`);

    try {
      const code = fs.readFileSync(file.path, "utf8");
      console.log(`=== File ${file.originalname} read, length: ${code.length} ===`);
      
      // If client sent 'paths' JSON, try to use that (keep ordering aligned with multer)
      let filename = file.originalname;
      try {
        const pathsJson = req.body.paths;
        if (pathsJson) {
          const paths = JSON.parse(pathsJson);
          const idx = req.files.indexOf(file);
          if (Array.isArray(paths) && paths[idx]) {
            filename = paths[idx];
            console.log(`=== Using client path: ${filename} for file ${file.originalname} ===`);
          }
        }
      } catch (e) {
        console.log(`=== Path parsing failed, using originalname: ${file.originalname} ===`);
        // ignore JSON parse errors and fall back to originalname
      }
      const detectedLang = detectLanguage(filename);

      if (!detectedLang) {
        console.warn(`Unsupported file type: ${filename}`);
        results.push({
          file: filename,
          code: code, // Always include code even for unsupported files
          analysis: { 
            suggestions: [], 
            geminiReview: { rawReview: "Unsupported file type (only JS, Python, Java, C/C++ supported)", suggestions: [] },
            error: "Unsupported file type"
          }
        });
        fs.unlinkSync(file.path);
        continue;
      }

      const language = detectedLang;
      const rejectionComments = await getRejectionComments(code, language);

      const analysis = await processSingleFileAnalysis(code, language, rejectionComments);

      console.log(`=== MULTI-FILE ANALYSIS FOR ${filename} ===`, {
        suggestionsCount: analysis.suggestions.length,
        geminiRawReviewLength: analysis.geminiReview.rawReview?.length || 0,
        geminiRawReviewPreview: (analysis.geminiReview.rawReview || '').substring(0, 200),
        geminiSuggestionsCount: analysis.geminiReview.suggestions?.length || 0,
        analysisKeys: Object.keys(analysis)
      });

      if (!analysis.geminiReview.rawReview || analysis.geminiReview.rawReview.length === 0) {
        console.warn(`=== WARNING: Empty Gemini review for ${filename} ===`);
      }
      
      if (!analysis.suggestions || analysis.suggestions.length === 0) {
        console.warn(`=== WARNING: No suggestions for ${filename} ===`);
      }

      results.push({
        file: filename,
        code, // include original file contents so the client can render the file even if names/paths differ
        analysis  // Full { suggestions, geminiReview } structure
      });

      fs.unlinkSync(file.path);

    } catch (err) {
      console.error(`Analysis failed for ${file.originalname}:`, err);
      results.push({
        file: file.originalname,
        analysis: { 
          suggestions: [], 
          geminiReview: { rawReview: `File processing error: ${err.message}`, suggestions: [] },
          error: "Analysis failed"
        }
      });
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  }

  console.log(`=== SENDING MULTI-FILE RESPONSE ===`, { 
    resultCount: results.length,
    sampleStructure: results[0] ? Object.keys(results[0]) : 'No results'
  });
  
  res.json({ results });
});

module.exports = router;