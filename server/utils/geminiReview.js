// Import GoogleGenerativeAI class from the official Google Generative AI package
const { GoogleGenerativeAI } = require("@google/generative-ai");
// Load environment variables from .env file into process.env
require("dotenv").config();

// Create a new instance of GoogleGenerativeAI using the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Calls Gemini and returns both:
 *  - rawReview: string of the entire review text
 *  - suggestions: array of structured suggestions [{ message, line, replacement?, source }]
 */
// Define an async function that takes code and language as parameters (default language is python)
async function reviewWithGemini(code, language = "python") {
  
  try {
    // Get the Gemini 1.5 Flash model instance for generating content
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

    
    const prompt = `
You are a code reviewer. Analyze the following ${language} code and return your feedback in this JSON format:

{
  "review": "<overall_summary>",
  "suggestions": [
    {
      "line": <line_number>,
      "message": "<explanation of issue or improvement>",
      "replacement": {
        "from": "<existing code snippet if applicable>",
        "to": "<replacement suggestion if applicable>"
      }
    },
    ...
  ]
}

Only return the JSON. Do not add any commentary or explanation.

Code:
\`\`\`${language}
${code}
\`\`\`
`;

    // Send the prompt to Gemini AI and await the result
    const result = await model.generateContent(prompt);
    // Extract the response object from the result
    const response = await result.response;
    // Get the raw text content from the response
    const raw = response.text();

    // Find the starting position of the JSON object in the raw response
    const jsonStart = raw.indexOf("{");
    // Find the ending position of the JSON object in the raw response
    const jsonEnd = raw.lastIndexOf("}");
    // Extract only the JSON portion from the raw response text
    const jsonText = raw.slice(jsonStart, jsonEnd + 1);

    // Parse the extracted JSON text into a JavaScript object
    const parsed = JSON.parse(jsonText);

    // Return structured object with processed data
    return {
      // Use the review field from parsed JSON as the raw review text
      rawReview: parsed.review,
      // Process the suggestions array and add consistent structure
      suggestions: (parsed.suggestions || []).map(s => ({
        // Extract line number or set to null if not provided
        line: s.line || null,
        // Extract message or use empty string if not provided
        message: s.message || '',
        // Add source identifier to track that this came from Gemini
        source: "gemini",
        // Extract replacement object or set to null if not provided
        replacement: s.replacement || null
      }))
    };
  // Catch any errors that occur during the API call or JSON processing
  } catch (err) {
    // Log the error message to console for debugging purposes
    console.error("Gemini Error:", err.message);
    // Return fallback object with error message and empty suggestions array
    return {
      // Provide a user-friendly error message as the raw review
      rawReview: "Gemini failed to review the code.",
      // Return empty array since no suggestions could be generated
      suggestions: []
    };
  }
}

// Export the function so it can be imported and used in other modules
module.exports = reviewWithGemini;