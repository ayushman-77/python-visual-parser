import { useRef } from "react";
import MonacoEditor from "@monaco-editor/react";

export const DEFAULT_CODE = "";

export default function Editor({ code, onChange, onCompile, loading }) {
  const fileRef = useRef();

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleEditorMount(editor, monaco) {
    monaco.languages.register({ id: "pylite" });
    monaco.languages.setMonarchTokensProvider("pylite", {
      keywords: ["for", "in", "print", "True", "False"],
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
        { token: "comment",      foreground: "656d76", fontStyle: "italic" },
        { token: "string",       foreground: "a5d6ff" },
        { token: "keyword",      foreground: "ff7b72", fontStyle: "bold" },
        { token: "constant",     foreground: "79c0ff" },
        { token: "number",       foreground: "ffa657" },
        { token: "number.float", foreground: "ffa657" },
        { token: "identifier",   foreground: "e6edf3" },
        { token: "operator",     foreground: "ff7b72" },
        { token: "delimiter",    foreground: "8b949e" },
      ],
      colors: {
        "editor.background":                   "#0d1117",
        "editor.foreground":                   "#e6edf3",
        "editorLineNumber.foreground":         "#484f58",
        "editorLineNumber.activeForeground":   "#8b949e",
        "editor.lineHighlightBackground":      "#161b22",
        "editorCursor.foreground":             "#4493f8",
        "editor.selectionBackground":          "#264f78",
        "editorIndentGuide.background1":        "#21262d",
        "editorIndentGuide.activeBackground1":  "#30363d",
        "editorGutter.background":             "#0d1117",
      },
    });

    monaco.editor.setTheme("compiler-dark");

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      onCompile
    );

    const placeholderDeco = editor.createDecorationsCollection([]);

    function updatePlaceholder() {
      const isEmpty = editor.getValue().trim() === "";
      if (isEmpty) {
        placeholderDeco.set([{
          range: new monaco.Range(1, 1, 1, 1),
          options: {
            isWholeLine: true,
            before: {
              content: "  # Write your code here or upload a .py file…",
              inlineClassName: "monaco-placeholder",
            },
          },
        }]);
      } else {
        placeholderDeco.clear();
      }
    }

    updatePlaceholder();
    editor.onDidChangeModelContent(updatePlaceholder);
  }

  return (
    <div className="editor-pane" style={{ width: "100%", height: "100%" }}>
      <div className="pane-header">
        <span className="pane-file-dot" />
        <strong>editor.py</strong>
        <span className="pane-hint">Ctrl + Enter to compile</span>
        <div className="pane-header-actions">
          <input
            ref={fileRef}
            type="file"
            accept=".py,.txt"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <button
            className="btn btn-secondary"
            onClick={() => fileRef.current.click()}
            title="Upload a .py file"
          >
            <span>📂</span> Upload .py
          </button>
          <button
            className="btn btn-primary"
            onClick={onCompile}
            disabled={loading || !code?.trim()}
            title="Compile (Ctrl+Enter)"
          >
            {loading
              ? <><span className="btn-spinner" /> Compiling…</>
              : <><span>▶</span> Run</>
            }
          </button>
        </div>
      </div>

      <div className="monaco-wrapper">
        <MonacoEditor
          language="pylite"
          value={code}
          onChange={(val) => onChange(val ?? "")}
          onMount={handleEditorMount}
          options={{
            fontSize:                   14,
            fontFamily:                 "'JetBrains Mono', 'Fira Code', Consolas, monospace",
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
            scrollbar:                  { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
          }}
          theme="compiler-dark"
        />
      </div>
    </div>
  );
}