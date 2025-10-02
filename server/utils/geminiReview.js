const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure dotenv is loaded
require('dotenv').config();

// Initialize with API key (ensure .env has GEMINI_API_KEY)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function reviewWithGemini(code, language, rejectionComments = []) {
  if (!process.env.GEMINI_API_KEY) {
    console.error('=== GEMINI ERROR: Missing GEMINI_API_KEY in .env ===');
    return fallbackResponse('Missing API key. Please set GEMINI_API_KEY in .env.');
  }

  try {
    console.log('=== GEMINI PROMPT PREP ===', { 
      language, 
      codeLength: code.length, 
      rejectionCount: rejectionComments.length,
      apiKeySet: !!process.env.GEMINI_API_KEY 
    });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });  // Stable model (avoids 404)

    // Shorter, focused prompt (emphasize NO markdown)
    const prompt = `You are a code reviewer. Review this ${language} code for issues, improvements, and best practices. Past rejections: ${rejectionComments.join('\n') || 'None'}.

Code:
\`\`\`${language}
${code.substring(0, 2000)}  // Limit to avoid token limits
\`\`\`

Output ONLY valid JSON with NO markdown, code blocks, or extra text. Just the JSON object:
{
  "review": "2-3 sentence summary of code quality and key suggestions.",
  "suggestions": [
    {
      "line": 1,
      "message": "Brief issue description.",
      "replacement": "Suggested code snippet or fix."
    }
  ]
}

Limit to 3-5 suggestions. NO backticks, NO "json" label.`;

    const result = await model.generateContent(prompt);
    let rawOutput = result.response.text().trim();
    console.log('=== GEMINI RAW OUTPUT (first 400 chars) ===', rawOutput.substring(0, 400) + (rawOutput.length > 400 ? '...' : ''));

    if (!rawOutput) {
      throw new Error('Empty response from Gemini');
    }

    // Step 1: Strip common markdown wrappers (````json, ```, etc.)
    rawOutput = rawOutput
      .replace(/^```json\s*/i, '')  // Remove leading ```json
      .replace(/```\s*$/i, '')      // Remove trailing ```
      .replace(/^```\s*/i, '')      // Remove any plain ```
      .replace(/```\s*$/i, '')      // Remove any plain ```
      .trim();

    console.log('=== GEMINI CLEANED OUTPUT (first 400 chars) ===', rawOutput.substring(0, 400) + (rawOutput.length > 400 ? '...' : ''));

    // Step 2: Robust JSON parsing
    let parsed;
    try {
      // Direct parse on cleaned output
      parsed = JSON.parse(rawOutput);
      console.log('=== GEMINI PARSE SUCCESS (direct) ===');
    } catch (parseErr1) {
      console.log('=== GEMINI PARSE ATTEMPT 1 FAILED ===', parseErr1.message);
      // Step 3: Extract JSON block with better regex (handles nested content)
      const jsonMatch = rawOutput.match(/\{[^{}]*("review"[^}]*"suggestions"[^}]*\$[^\$]*\$[^{}]*)\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse('{' + jsonMatch[1] + '}');
          console.log('=== GEMINI PARSE SUCCESS (extracted) ===');
        } catch (parseErr2) {
          console.log('=== GEMINI PARSE ATTEMPT 2 FAILED ===', parseErr2.message);
          // Step 4: Semi-parse - Extract review text directly as fallback
          const reviewMatch = rawOutput.match(/"review"\s*:\s*"([^"]*(?:"[^"]*)*[^"]*)"/);
          const suggestionsMatch = rawOutput.match(/"suggestions"\s*:\s*\$([^\$]*)\$/);
          if (reviewMatch) {
            console.log('=== GEMINI SEMI-PARSE SUCCESS (text extraction) ===');
            const rawReview = reviewMatch[1].replace(/\\"/g, '"');  // Unescape quotes
            const suggestions = suggestionsMatch ? JSON.parse('[' + suggestionsMatch[1] + ']') : [];
            return {
              rawReview: `AI Summary: ${rawReview.substring(0, 200)}... (Full parsing failed; manual review recommended.)`,
              suggestions: Array.isArray(suggestions) ? suggestions.map(s => ({
                line: s.line || 'N/A',
                message: s.message || 'General suggestion.',
                replacement: s.replacement || null,
                source: 'gemini'
              })) : []
            };
          }
          throw new Error(`All parsing failed: ${parseErr2.message}`);
        }
      } else {
        throw new Error(`No JSON structure found in: ${rawOutput.substring(0, 100)}`);
      }
    }

    const rawReview = parsed.review || 'No detailed summary available from AI review.';
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.map(s => ({
      line: s.line || 'N/A',
      message: s.message || 'General improvement suggested.',
      replacement: s.replacement || null,
      source: 'gemini'  // Ensure for frontend
    })) : [];

    console.log('=== GEMINI PARSED RESULT ===', { 
      rawReviewPreview: rawReview.substring(0, 100) + '...',
      suggestionsCount: suggestions.length,
      firstSuggestion: suggestions[0]?.message 
    });

    return {
      rawReview,
      suggestions
    };

  } catch (err) {
    console.error('=== GEMINI API ERROR ===', err.message);
    return fallbackResponse(`Parsing failed: ${err.message.substring(0, 50)}`);
  }
}

// Enhanced fallback (short review for frontend preview)
function fallbackResponse(errorMsg) {
  console.log('=== USING FALLBACK DUE TO ERROR ===', errorMsg.substring(0, 100));
  return {
    rawReview: `AI Review Unavailable: ${errorMsg}. Code appears syntactically correct—review manually for best practices.`,  // Short (~80 chars)
    suggestions: [
      {
        line: 'N/A',
        message: 'Add comments for better readability.',
        replacement: '// Example: Add comment here',
        source: 'gemini'
      },
      {
        line: 'N/A',
        message: 'Consider error handling for robustness.',
        replacement: null,
        source: 'gemini'
      }
    ]
  };
}

module.exports = { reviewWithGemini };