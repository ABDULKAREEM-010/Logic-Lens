// Import the main Parser class from node-tree-sitter library for parsing code
const Parser = require("node-tree-sitter");
// Import the C language grammar for tree-sitter to understand C syntax
const C = require("tree-sitter-c");
// Import the C++ language grammar for tree-sitter to understand C++ syntax
const CPP = require("tree-sitter-cpp");

// Define an async function that analyzes C/C++ code and returns suggestions
// Takes code string and file extension (defaults to "cpp")
async function analyzeCpp(code, ext = "cpp") {
    // Create a new instance of the tree-sitter parser
    const parser = new Parser();
    // Determine which language grammar to use based on file extension
    const language = ext === "c" ? C : CPP;
    // Configure the parser to use the appropriate language grammar
    parser.setLanguage(language);

    // Parse the input code and generate an Abstract Syntax Tree (AST)
    const tree = parser.parse(code);
    // Get the root node of the AST - this represents the entire program
    const root = tree.rootNode;

    // Initialize an empty array to store analysis suggestions/findings
    const suggestions = [];

    // Define a recursive function to traverse the AST and analyze nodes
    function walk(node) {
    // Check if the current node represents a function definition
    if (node.type === "function_definition") {
        // Extract the function name from the declarator field, or use "<anonymous>" if not found
        const funcName = node.childForFieldName("declarator")?.text || "<anonymous>";
        // Add an informational suggestion about the found function
        suggestions.push({
        // Set the suggestion type as informational
        type: "info",
        // Create a descriptive message about the function
        message: `Found function: ${funcName}`,
        // Get the line number (row + 1 because rows are 0-indexed)
        line: node.startPosition.row + 1,
        // Get the column position where the function starts
        column: node.startPosition.column,
        });
    }

    // Recursively walk through all named child nodes of the current node
    for (let i = 0; i < node.namedChildCount; i++) {
        // Get the i-th named child node and recursively analyze it
        walk(node.namedChild(i));
    }
    }

    // Start the recursive traversal from the root node
    walk(root);

    // Return the array of suggestions found during analysis
    return suggestions;
}

// Export the function so it can be imported and used in other modules
module.exports = analyzeCpp;