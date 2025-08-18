const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Calls Gemini and returns:
 *  - rawReview: string summary of the review
 *  - suggestions: [{ message, line, replacement?, source }]
 * 
 * @param {string} code - Code to analyze
 * @param {string} language - Language of the code
 * @param {Array<string>} rejectionComments - Array of previous rejection comments
 */
async function reviewWithGemini(code, language = "python", rejectionComments = []) {
  try {
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

    // Format rejection feedback
    let rejectionNotes = "";
    if (rejectionComments.length > 0) {
      rejectionNotes =
        `The following feedback was previously rejected by the user. Avoid making similar suggestions:\n` +
        rejectionComments.map((comment, idx) => `${idx + 1}. ${comment}`).join("\n") +
        `\n\n`;
    }

    const prompt = `
${rejectionNotes}
You are a code reviewer. Analyze the following ${language} code and return your feedback in the following JSON format:

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
    }
  ]
}

Only return the JSON. Do not add any explanations or commentary.

Code:
\`\`\`${language}
${code}
\`\`\`
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text();

    // Extract JSON safely
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const jsonText = raw.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonText);

    return {
      rawReview: parsed.review,
      suggestions: (parsed.suggestions || []).map(s => ({
        line: s.line || null,
        message: s.message || '',
        source: "gemini",
        replacement: s.replacement || null
      }))
    };

  } catch (err) {
    console.error("Gemini Error:", err.message);
    return {
      rawReview: "Gemini failed to review the code.",
      suggestions: []
    };
  }
}

module.exports = reviewWithGemini;
