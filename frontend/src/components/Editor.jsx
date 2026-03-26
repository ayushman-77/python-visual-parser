import { useRef } from "react";
import MonacoEditor from "@monaco-editor/react";

export const DEFAULT_CODE = "";

export default function Editor({ code, onChange, onCompile, loading }) {
  const fileRef = useRef();

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target.result);
    reader.readAsText(file);
    e.target.value = "";
  }

  function onMount(editor, monaco) {
    monaco.languages.register({ id: "pylite" });
    monaco.languages.setMonarchTokensProvider("pylite", {
      keywords: ["for","in","print","True","False"],
      tokenizer: {
        root: [
          [/#.*$/,               "comment"],
          [/"[^"]*"|'[^']*'/,    "string"],
          [/\b(True|False)\b/,   "constant"],
          [/\b(for|in|print)\b/, "keyword"],
          [/\b\d+\.\d+\b/,       "number.float"],
          [/\b\d+\b/,            "number"],
          [/[a-zA-Z_]\w*/,       "identifier"],
          [/[+\-*/]=?/,          "operator"],
          [/[(){}\[\],:.]/,      "delimiter"],
        ],
      },
    });

    monaco.editor.defineTheme("compiler-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment",      foreground: "4b5675", fontStyle: "italic" },
        { token: "string",       foreground: "a5d6ff" },
        { token: "keyword",      foreground: "c084fc", fontStyle: "bold" },
        { token: "constant",     foreground: "818cf8" },
        { token: "number",       foreground: "fb923c" },
        { token: "number.float", foreground: "fb923c" },
        { token: "identifier",   foreground: "e2e8f0" },
        { token: "operator",     foreground: "f472b6" },
        { token: "delimiter",    foreground: "94a3b8" },
      ],
      colors: {
        "editor.background":                   "#0a0a12",
        "editor.foreground":                   "#e2e8f0",
        "editorLineNumber.foreground":         "#2e2c4a",
        "editorLineNumber.activeForeground":   "#64748b",
        "editor.lineHighlightBackground":      "#0f0e1a",
        "editorCursor.foreground":             "#818cf8",
        "editor.selectionBackground":          "#1e1b4b",
        "editorIndentGuide.background1":        "#1e1c2e",
        "editorIndentGuide.activeBackground1":  "#2d2b45",
        "editorGutter.background":             "#0a0a12",
        "editor.lineHighlightBorder":          "#0f0e1a",
      },
    });

    monaco.editor.setTheme("compiler-dark");

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onCompile);

    // Placeholder decoration
    const deco = editor.createDecorationsCollection([]);
    const update = () => {
      if (editor.getValue().trim() === "") {
        deco.set([{
          range: new monaco.Range(1,1,1,1),
          options: {
            isWholeLine: true,
            before: {
              content: "  # Write or upload your code, then press ▶ Run…",
              inlineClassName: "monaco-placeholder",
            },
          },
        }]);
      } else {
        deco.clear();
      }
    };
    update();
    editor.onDidChangeModelContent(update);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div className="pane-head">
        <span className="pane-dot" />
        <strong>editor.py</strong>
        <span className="pane-hint">Ctrl + Enter to run</span>
        <div className="pane-actions">
          <input ref={fileRef} type="file" accept=".py,.txt" style={{ display:"none" }} onChange={handleUpload} />
          <button className="btn btn-ghost" style={{ fontSize:12, padding:"5px 11px" }} onClick={() => fileRef.current.click()}>
            📂 Upload .py
          </button>
        </div>
      </div>

      <div className="monaco-wrapper">
        <MonacoEditor
          language="pylite"
          value={code}
          onChange={val => onChange(val ?? "")}
          onMount={onMount}
          options={{
            fontSize:                   14,
            fontFamily:                 "'JetBrains Mono','Fira Code',Consolas,monospace",
            fontLigatures:              true,
            lineHeight:                 23,
            minimap:                    { enabled: false },
            scrollBeyondLastLine:       false,
            wordWrap:                   "on",
            renderLineHighlight:        "gutter",
            cursorBlinking:             "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling:            true,
            padding:                    { top: 16, bottom: 16 },
            renderWhitespace:           "boundary",
            tabSize:                    4,
            insertSpaces:               true,
            bracketPairColorization:    { enabled: true },
            guides:                     { indentation: true, bracketPairs: true },
            overviewRulerLanes:         0,
            scrollbar:                  { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
          }}
          theme="compiler-dark"
        />
      </div>
    </div>
  );
}