// Import the ESLint class from the eslint package for JavaScript code analysis
const { ESLint } = require("eslint");

// Define an async function that analyzes JavaScript code using ESLint
async function analyzeJavaScript(code) {
  // Start try-catch block to handle any ESLint configuration or execution errors
  try {
    // Create a new ESLint instance with custom configuration
    const eslint = new ESLint({
      // Define the base configuration for ESLint
      baseConfig: {
        // Set language options for modern JavaScript
        languageOptions: {
          // Use the latest ECMAScript version for modern JS features
          ecmaVersion: "latest",
          // Set source type to module to support import/export syntax
          sourceType: "module",
        },
        // Define specific linting rules to check for
        rules: {
          // Require semicolons at the end of statements (warn level)
          semi: ["warn", "always"],
          // Require double quotes for strings (warn level)
          quotes: ["warn", "double"],
          // Warn about variables that are declared but never used
          "no-unused-vars": "warn",
          // Warn about variables that are used but never defined
          "no-undef": "warn",
        },
      },
      // Enable autofix collection to generate code correction suggestions
      fix: true,
      // Don't use external ESLint config files, only use our baseConfig
      overrideConfigFile: true,
    });

    // Run ESLint on the provided code string (no temp file needed)
    const results = await eslint.lintText(code);
    // Initialize empty array to store processed suggestions
    const suggestions = [];

    // Iterate through each result object (usually just one for single code string)
    for (const result of results) {
      // Iterate through each message (violation/issue) found in the result
      for (const msg of result.messages) {
        // Check if ESLint can autofix this issue and extract the fix details
        const replacement =
          // If message has fix info and range data available
          msg.fix && msg.fix.range
            ? {
                // Extract the original problematic code using the fix range
                from: code.slice(msg.fix.range[0], msg.fix.range[1]),
                // Get the suggested replacement text from ESLint
                to: msg.fix.text,
              }
            // If no autofix available, set replacement to null
            : null;

        // Add a structured suggestion object to the suggestions array
        suggestions.push({
          // Line number where the issue occurs
          line: msg.line,
          // Source identifier to track this came from ESLint
          source: "linter",
          // Descriptive message explaining the issue
          message: msg.message,
          // Convert ESLint severity number to readable string (2=Error, 1=Warning)
          severity: msg.severity === 2 ? "Error" : "Warning",
          // The specific ESLint rule that was violated
          ruleId: msg.ruleId,
          // Include the replacement suggestion (or null if no autofix)
          replacement,
        });
      }
    }

    // Return the array of processed suggestions
    return suggestions;
  // Catch any errors during ESLint configuration or execution
  } catch (error) {
    // Log the error message to console for debugging
    console.error("ESLint configuration error:", error.message);
    // Re-throw with a more descriptive error message
    throw new Error(`JavaScript analysis failed: ${error.message}`);
  }
}

// Export the function so it can be imported and used in other modules
module.exports = analyzeJavaScript;