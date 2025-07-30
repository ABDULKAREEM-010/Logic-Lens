import React from 'react';

const CodeEditor = ({ code, setCode }) => {
  return (
    <textarea
      className="code-editor"
      rows="15"
      value={code}
      onChange={(e) => setCode(e.target.value)}
      placeholder="Write your code here..."
    />
  );
};

export default CodeEditor;
