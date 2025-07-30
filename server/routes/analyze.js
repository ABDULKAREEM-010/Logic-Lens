const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const reviewWithGemini = require("../utils/geminiReview");
const analyzeJavaScript = require("../utils/analyzeJS");
const analyzeJava = require("../utils/analyzeJava");
const analyzeCpp = require("../utils/analyzeCpp");

// Define a POST route handler for the root path ("/") - this is the main endpoint
router.post("/", async (req, res) => {
  // Extract 'language' and 'code' properties from the request body using destructuring
  const { language, code } = req.body;

  // Check if the submitted programming language is Python
  if (language === "python") {
    // Create a file path pointing to a temporary Python file in the temp directory
    const filePath = path.join(__dirname, "../temp/temp.py");
    // Write the submitted code to the temporary Python file synchronously
    fs.writeFileSync(filePath, code);

    // Execute a Python script to analyze the code, with async callback for results
    exec("python python/analyze_python.py", async (err, stdout, stderr) => {
      // Log the standard output from the Python analysis script for debugging
      console.log("Python STDOUT:", stdout);
      // Log any errors from the Python analysis script for debugging
      console.log("Python STDERR:", stderr);

      // Initialize an empty array to store static analysis suggestions
      let staticSuggestions = [];

      // Try to parse the Python script output as JSON
      try {
        // Convert the stdout string to a JavaScript array/object
        staticSuggestions = JSON.parse(stdout);
      } catch (e) {
        // If JSON parsing fails, log the error and keep empty array
        console.error("Parse error:", e);
      }

      // Call Gemini AI to review the code and destructure the response
      // rawReview = complete AI text, suggestions renamed to geminiSuggestions
      const { rawReview, suggestions: geminiSuggestions } = await reviewWithGemini(code, language);

      // Send JSON response with combined suggestions and separate Gemini review data
      res.json({
        // Merge static analysis and AI suggestions using spread operator
        suggestions: [...staticSuggestions, ...geminiSuggestions],
        // Include separate Gemini review object with raw text and parsed suggestions
        geminiReview: {
          rawReview,
          suggestions: geminiSuggestions
        }
      });
    });

  // Check if the submitted programming language is JavaScript
  } else if (language === "javascript") {
    // Start error handling block for JavaScript analysis
    try {
      // Call the JavaScript analyzer utility function and await the result
      const staticSuggestions = await analyzeJavaScript(code);
      // Get AI review from Gemini for the JavaScript code
      const { rawReview, suggestions: geminiSuggestions } = await reviewWithGemini(code, language);
      // Send successful response with combined analysis results
      res.json({
        // Combine static and AI suggestions into one array
        suggestions: [...staticSuggestions, ...geminiSuggestions],
        // Include separate Gemini review data
        geminiReview: {
          rawReview,
          suggestions: geminiSuggestions
        }
      });
    } catch (error) {
      // Log any errors that occurred during JavaScript analysis
      console.error("JavaScript analysis failed:", error);
      // Send 500 Internal Server Error response with error message
      res.status(500).json({ error: "JavaScript analysis failed" });
    }

  // Check if the submitted programming language is Java
  } else if (language === "java") {
    // Start error handling block for Java analysis
    try {
      // Call the Java analyzer utility function and await the result
      const staticSuggestions = await analyzeJava(code);
      // Get AI review from Gemini for the Java code
      const { rawReview, suggestions: geminiSuggestions } = await reviewWithGemini(code, language);
      // Send successful response with combined analysis results
      res.json({
        // Combine static and AI suggestions into one array
        suggestions: [...staticSuggestions, ...geminiSuggestions],
        // Include separate Gemini review data
        geminiReview: {
          rawReview,
          suggestions: geminiSuggestions
        }
      });
    } catch (err) {
      // Log any errors that occurred during Java analysis
      console.error("Java analysis failed:", err);
      // Send 500 Internal Server Error response with error message
      res.status(500).json({ error: "Java analysis failed" });
    }

  // Check if the submitted language is C++ or C
  } else if (language === "cpp" || language === "c") {
    // Start error handling block for C/C++ analysis
    try {
      // Determine the correct file extension based on language type
      const ext = language === "c" ? "c" : "cpp";
      // Call the C/C++ analyzer utility function with appropriate extension
      const staticSuggestions = await analyzeCpp(code, ext);
      // Get AI review from Gemini for the C/C++ code
      const { rawReview, suggestions: geminiSuggestions } = await reviewWithGemini(code, language);
      // Send successful response with combined analysis results
      res.json({
        // Combine static and AI suggestions into one array
        suggestions: [...staticSuggestions, ...geminiSuggestions],
        // Include separate Gemini review data
        geminiReview: {
          rawReview,
          suggestions: geminiSuggestions
        }
      });
    } catch (err) {
      // Log any errors that occurred during C/C++ analysis
      console.error("C/C++ analysis failed:", err);
      // Send 500 Internal Server Error response with error message
      res.status(500).json({ error: "C/C++ analysis failed" });
    }

  // Handle any unsupported programming languages
  } else {
    // Send 400 Bad Request response for unsupported languages with error message
    return res.status(400).json({ error: "Only Python, Java, C, CPP, JavaScript supported." });
  }
});

// Export the router so it can be imported and used in other parts of the application
module.exports = router;