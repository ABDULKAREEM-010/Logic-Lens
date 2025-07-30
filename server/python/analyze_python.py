# Import json module for parsing and generating JSON data
import json
# Import pylint.lint module to run pylint analysis programmatically
import pylint.lint
# Import JSONReporter to format pylint output as JSON
from pylint.reporters.json_reporter import JSONReporter
# Import StringIO to capture pylint output in memory instead of printing to console
from io import StringIO
# Import sys module to write debug messages to stderr
import sys

# Read the temporary Python file that was created by the Node.js server
with open("temp/temp.py", "r") as f:
    # Load the entire file content into a string variable
    code = f.read()

# Print debug information to stderr (not stdout) so it doesn't interfere with JSON output
print("DEBUG: Loaded code -->", file=sys.stderr)
# Print the actual code content to stderr for debugging purposes
print(code, file=sys.stderr)
# Print debug message indicating the script has started
print("DEBUG: analyze_python.py started", file=sys.stderr)

# Define command-line options for pylint analysis
pylint_opts = [
    # Set output format to JSON for easy parsing
    "--output-format=json",
    # Enable all available pylint checks (comprehensive analysis)
    "--enable=all",
    # Specify the file to analyze
    "temp/temp.py"
]

# Create a StringIO object to capture pylint's output in memory
output = StringIO()
# Create a JSON reporter that will write to our StringIO buffer
reporter = JSONReporter(output=output)

# Run pylint with the specified options and custom reporter
pylint.lint.Run(pylint_opts, reporter=reporter)

# Get the captured output from the StringIO buffer as a string
raw_output = output.getvalue()

# Start error handling for JSON parsing and processing
try:
    # Parse the raw pylint JSON output into a Python list/dict structure
    messages = json.loads(raw_output)
    # Initialize empty list to store processed suggestions
    suggestions = []
    # Iterate through each pylint message/issue found
    for msg in messages:
        # Create a standardized suggestion object for each pylint message
        suggestions.append({
            # Extract line number where issue occurs, default to 0 if not found
            "line": msg.get("line", 0),
            # Add source identifier to track this came from pylint
            "tool": "pylint",
            # Extract the descriptive message about the issue
            "issue": msg.get("message", ""),
            # Extract and capitalize the severity level (error, warning, etc.)
            "severity": msg.get("type", "Low").capitalize(),
            # Extract the pylint rule symbol/code that was violated
            "suggestion": msg.get("symbol", "")
        })
    # Print the processed suggestions as JSON to stdout (this is what Node.js reads)
    print(json.dumps(suggestions))
# Handle any errors during JSON parsing or processing
except Exception as e:
    # Print error message to stderr for debugging
    print("ERROR parsing pylint output:", e, file=sys.stderr)
    # Print empty JSON array to stdout so Node.js gets valid JSON even on error
    print(json.dumps([]))

# Print debug message indicating the script has completed
print("DEBUG: analyze_python.py finished", file=sys.stderr)