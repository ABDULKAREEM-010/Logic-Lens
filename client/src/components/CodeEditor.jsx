import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

const CodeEditor = ({ code, setCode }) => {
  return (
    <CodeMirror
      value={code}
      height="400px"
      extensions={[javascript()]}
      onChange={(value) => setCode(value)}
    />
  );
};

export default CodeEditor;
