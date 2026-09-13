import { useRef, useState, useEffect } from "react";
import MonacoEditor from "@monaco-editor/react";

export const DEFAULT_CODE = `a = 5

while a > 3:
    print(a)
    a -= 1

b = 4
if a < 3:
    print(b)
else:
    print(b * a)

for i in range(1, 7, 2):
    print(i)
`;



export default function Editor({ code, onChange, onCompile, loading, onEditorMount }) {
  const fileRef = useRef();
  const editorRef = useRef(null);
  const [stats, setStats] = useState({ lines: 0, chars: 0 });
  const [copied, setCopied] = useState(false);


  useEffect(() => {
    setStats({ lines: code ? code.split("\n").length : 0, chars: code ? code.length : 0 });
  }, [code]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };



  const onMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.languages.register({ id: "python" });
    monaco.languages.setMonarchTokensProvider("python", {
      keywords: ["for","in","while","if","elif","else","print","range","True","False"],
      tokenizer: {
        root: [
          [/#.*$/, "comment"],
          [/".*?"|'.*?'/, "string"],
          [/\b(True|False)\b/, "constant"],
          [/\b(while|if|elif|else)\b/, "keyword.control"],
          [/\b(for|in|range|print)\b/, "keyword"],
          [/\b\d+\.\d+\b/, "number.float"],
          [/\b\d+\b/, "number"],
          [/[a-zA-Z_]\w*/, "identifier"],
          [/==|!=|<=|>=/, "operator.comparison"],
          [/[<>]/, "operator.comparison"],
          [/[+\-*\/%]=?/, "operator"],
          [/[(){}\[\],.:]/, "delimiter"],
        ],
      },
    });

    monaco.editor.defineTheme("compiler-dark", {
      base: "vs-dark", inherit: true,
      rules: [
        { token: "comment", foreground: "3d3b5c", fontStyle: "italic" },
        { token: "string", foreground: "a5d6ff" },
        { token: "keyword", foreground: "c084fc", fontStyle: "bold" },
        { token: "keyword.control", foreground: "fbbf24", fontStyle: "bold" },
        { token: "constant", foreground: "818cf8" },
        { token: "number", foreground: "fb923c" },
        { token: "number.float", foreground: "fb923c" },
        { token: "identifier", foreground: "e2e8f0" },
        { token: "operator", foreground: "f472b6" },
        { token: "operator.comparison", foreground: "4ade80" },
        { token: "delimiter", foreground: "64748b" },
      ],
      colors: {
        "editor.background": "#080810",
        "editor.foreground": "#e2e8f0",
        "editorLineNumber.foreground": "#2a2848",
        "editorLineNumber.activeForeground": "#64748b",
        "editor.lineHighlightBackground": "#0d0c1c",
        "editorCursor.foreground": "#818cf8",
        "editor.selectionBackground": "#1e1b4b",
        "editorIndentGuide.background1": "#1c1a32",
        "editorIndentGuide.activeBackground1": "#2d2b45",
        "editorGutter.background": "#080810",
        "editor.lineHighlightBorder": "#0d0c1c",
        "editorError.foreground": "#f87171",
        "editorWarning.foreground": "#fbbf24",
      },
    });
    monaco.editor.setTheme("compiler-dark");

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onCompile);
    editor.addCommand(monaco.KeyCode.Enter, () => {
      const pos = editor.getPosition();
      const line = editor.getModel().getLineContent(pos.lineNumber);
      const m = line.match(/^(\s*)/);
      const curr = m ? m[1] : "";
      editor.trigger("keyboard", "type", {
        text: line.trimEnd().endsWith(":") ? "\n" + curr + "    " : "\n" + curr,
      });
    });

    const deco = editor.createDecorationsCollection([]);
    const updatePlaceholder = () => {
      if (editor.getValue().trim() === "") {
        deco.set([{ range: new monaco.Range(1,1,1,1), options: { isWholeLine: true, before: { content: "  # Write or upload code, then press Run...", inlineClassName: "monaco-placeholder" } } }]);
      } else { deco.clear(); }
    };
    updatePlaceholder();
    editor.onDidChangeModelContent(updatePlaceholder);
    if (onEditorMount) onEditorMount(editor, monaco);
  };

  const hasCode = code && code.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div className="pane-head">
        <span className="pane-dot" />
        <strong>editor.py</strong>
        <span className="pane-hint">Ctrl + Enter to run</span>
        <div className="pane-actions">
          {hasCode && (
            <div className="editor-stats">
              <span className={stats.lines > 0 ? "active" : ""}>{stats.lines}L</span>
              <span className={stats.chars > 0 ? "active" : ""}>{stats.chars}C</span>
            </div>
          )}

          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={handleCopy} disabled={!hasCode} title="Copy">
            {copied ? "Copied" : "Copy"}
          </button>
          <input ref={fileRef} type="file" accept=".py,.txt" style={{ display: "none" }} onChange={handleUpload} />
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => fileRef.current.click()} title="Upload">
            Upload .py
          </button>
        </div>
      </div>
      <div className="monaco-wrapper">
        <MonacoEditor
          language="python"
          value={code}
          onChange={(val) => onChange(val ?? "")}
          onMount={onMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace",
            fontLigatures: true,
            lineHeight: 23,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            renderLineHighlight: "gutter",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 },
            renderWhitespace: "boundary",
            tabSize: 4,
            insertSpaces: true,
            bracketPairColorization: { enabled: true },
            guides: { indentation: true, bracketPairs: true },
            overviewRulerLanes: 2,
            scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
          }}
          theme="compiler-dark"
        />
      </div>
    </div>
  );
}
