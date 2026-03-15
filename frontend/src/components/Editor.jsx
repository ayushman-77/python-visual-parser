import React from 'react';
import MonacoEditor from '@monaco-editor/react';

export default function Editor({ code, onChange }) {
  return (
    <div style={{ flex: 1, overflow: 'hidden' }}>
      <MonacoEditor
        height="100%"
        defaultLanguage="java"
        theme="vs-dark"
        value={code}
        onChange={(val) => onChange(val ?? '')}
        options={{
          fontSize: 14,
          minimap:         { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap:        'on',
          lineNumbers:     'on',
          renderLineHighlight: 'line',
          automaticLayout: true,
          tabSize:         4,
          formatOnPaste:   true,
          suggestOnTriggerCharacters: true,
        }}
      />
    </div>
  );
}