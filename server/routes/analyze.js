const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const reviewWithGemini = require("../utils/geminiReview");
const analyzeJavaScript = require("../utils/analyzeJS");
const analyzeJava = require("../utils/analyzeJava");
const analyzeCpp = require("../utils/analyzeCpp");

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Helper to fetch past rejection comments for the same code and language
async function getRejectionComments(code, language) {
  try {
    const { data, error } = await supabase
      .from("feedback")
      .select("comment, suggestion")
      .eq("language", language)
      .eq("code", code)
      .eq("decision", "reject");

    if (error) {
      console.error("Error fetching rejection comments:", error);
      return [];
    }

    return data
      .filter(d => d.comment?.trim())
      .map(d => `• Previously, the suggestion "${d.suggestion}" was rejected because: "${d.comment}"`);
  } catch (err) {
    console.error("Supabase fetch error:", err);
    return [];
  }
}

// Main analysis route
router.post("/", async (req, res) => {
  const { language, code } = req.body;

  if (!language || !code) {
    return res.status(400).json({ error: "Missing code or language" });
  }

  const rejectionComments = await getRejectionComments(code, language);

  // Python
  if (language === "python") {
    const filePath = path.join(__dirname, "../temp/temp.py");
    fs.writeFileSync(filePath, code);

    exec("python python/analyze_python.py", async (err, stdout, stderr) => {
      console.log("Python STDOUT:", stdout);
      console.log("Python STDERR:", stderr);

      let staticSuggestions = [];
      try {
        staticSuggestions = JSON.parse(stdout);
      } catch (e) {
        console.error("Parse error:", e);
      }

      const { rawReview, suggestions: geminiSuggestions } =
        await reviewWithGemini(code, language, rejectionComments);

      res.json({
        suggestions: [...staticSuggestions, ...geminiSuggestions],
        geminiReview: { rawReview, suggestions: geminiSuggestions }
      });
    });

  // JavaScript
  } else if (language === "javascript") {
    try {
      const staticSuggestions = await analyzeJavaScript(code);
      const { rawReview, suggestions: geminiSuggestions } =
        await reviewWithGemini(code, language, rejectionComments);

      res.json({
        suggestions: [...staticSuggestions, ...geminiSuggestions],
        geminiReview: { rawReview, suggestions: geminiSuggestions }
      });
    } catch (error) {
      console.error("JavaScript analysis failed:", error);
      res.status(500).json({ error: "JavaScript analysis failed" });
    }

  // Java
  } else if (language === "java") {
    try {
      const staticSuggestions = await analyzeJava(code);
      const { rawReview, suggestions: geminiSuggestions } =
        await reviewWithGemini(code, language, rejectionComments);

      res.json({
        suggestions: [...staticSuggestions, ...geminiSuggestions],
        geminiReview: { rawReview, suggestions: geminiSuggestions }
      });
    } catch (err) {
      console.error("Java analysis failed:", err);
      res.status(500).json({ error: "Java analysis failed" });
    }

  // C/C++
  } else if (language === "cpp" || language === "c") {
    try {
      const ext = language === "c" ? "c" : "cpp";
      const staticSuggestions = await analyzeCpp(code, ext);
      const { rawReview, suggestions: geminiSuggestions } =
        await reviewWithGemini(code, language, rejectionComments);

      res.json({
        suggestions: [...staticSuggestions, ...geminiSuggestions],
        geminiReview: { rawReview, suggestions: geminiSuggestions }
      });
    } catch (err) {
      console.error("C/C++ analysis failed:", err);
      res.status(500).json({ error: "C/C++ analysis failed" });
    }

  } else {
    res.status(400).json({ error: "Only Python, Java, C, CPP, JavaScript supported." });
  }
});

module.exports = router;
