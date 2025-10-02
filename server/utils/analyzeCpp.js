const Parser = require("node-tree-sitter");
const C = require("tree-sitter-c");
const CPP = require("tree-sitter-cpp");

async function analyzeCpp(code, ext = "cpp") {
  const parser = new Parser();
  parser.setLanguage(ext === "c" ? C : CPP);

  const tree = parser.parse(code);
  const root = tree.rootNode;
  const suggestions = [];

  function walk(node) {
    if (node.type === "function_definition") {
      const funcName = node.childForFieldName("declarator")?.text || "<anonymous>";
      suggestions.push({
        type: "info",
        message: `Found function: ${funcName}`,
        line: node.startPosition.row + 1,
        column: node.startPosition.column,
      });
    }
    for (let i = 0; i < node.namedChildCount; i++) walk(node.namedChild(i));
  }

  walk(root);
  return suggestions;
}

module.exports = analyzeCpp;
