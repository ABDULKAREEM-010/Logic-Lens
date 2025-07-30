// Import exec function from child_process to execute shell commands
const { exec } = require("child_process");
// Import Node.js file system module for file read/write operations
const fs = require("fs");
// Import Node.js path module for working with file and directory paths
const path = require("path");

// Define an async function that analyzes Java code using Checkstyle tool
async function analyzeJava(code) {
    // Create a file path pointing to a temporary Java file in the temp directory
    const filePath = path.join(__dirname, "../temp/Temp.java");
    // Write the submitted Java code to the temporary file synchronously
    fs.writeFileSync(filePath, code);

    // Return a Promise to handle the asynchronous shell command execution
    return new Promise((resolve, reject) => {
    // Execute Checkstyle JAR file with Google's code style rules on the temp Java file
    exec(`java -jar tools/checkstyle.jar -c tools/google_checks.xml ${filePath}`, (err, stdout, stderr) => {
        // Check if there was an error executing the Checkstyle command
        if (err) {
        // Log the error message to console for debugging
        console.error("Checkstyle Error:", stderr);
        // Resolve with an error suggestion instead of rejecting (graceful degradation)
        return resolve([{ type: "error", issue: "Checkstyle failed to run." }]);
        }

        // Process the Checkstyle output to extract meaningful suggestions
        const suggestions = stdout
        // Split the output into individual lines
        .split("\n")
        // Filter to only include lines that mention our temp file (actual violations)
        .filter(line => line.includes("Temp.java"))
        // Transform each violation line into a structured suggestion object
        .map(line => ({
            // Set the suggestion type as warning (Checkstyle violations are typically warnings)
            type: "warning",
            // Use the trimmed line as the issue description
            issue: line.trim()
        }));

        // Resolve the Promise with the processed suggestions array
        resolve(suggestions);
    });
    });
}

// Export the function so it can be imported and used in other modules
module.exports = analyzeJava;