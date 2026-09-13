import { useState, useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
cytoscape.use(cytoscapeDagre);

// ── Tab definitions ──────────────────────────────────────────────────────
const TABS = [
  { id: "overview",    label: "Overview",     icon: "⬡" },
  { id: "tokens",      label: "Tokens",       icon: "🔤" },
  { id: "symtable",    label: "Sym Table",    icon: "📋" },
  { id: "ast",         label: "AST",          icon: "🌲" },
  { id: "cfg",         label: "CFG",          icon: "⬡" },
  { id: "firstfollow", label: "First/Follow", icon: "∑" },
  { id: "parsetable",  label: "Parse Table",  icon: "📊" },
  { id: "terminal",    label: "Terminal",     icon: "🖥️" },
  { id: "errors",      label: "Errors",       icon: "⚠" },
];

// ── ResultPanel ──────────────────────────────────────────────────────────
export default function ResultPanel({ result, loading, defaultTab = "overview", onJumpToLine }) {
  const [active, setActive] = useState(defaultTab);
  useEffect(() => { setActive(defaultTab); }, [defaultTab]);

  const errCount = result
    ? (result.lexerErrors?.length ?? 0) + (result.parserErrors?.length ?? 0)
    : 0;

  // Before any compile — show ready state
  if (!loading && !result) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div className="pane-head">
          <strong style={{ fontSize: 12.5 }}>Output</strong>
        </div>
        <div className="ready-state">
          <div className="ready-icon">⚙</div>
          <div className="ready-title">Ready to compile</div>
          <div className="ready-sub">
            Write or upload code in the editor, then press{" "}
            <kbd>▶ Run</kbd> or <kbd>Ctrl+Enter</kbd> to see the results here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab ${active === t.id ? "on" : ""}`}
            onClick={() => setActive(t.id)}
            id={`tab-${t.id}`}
          >
            <span>{t.icon}</span>
            {t.label}
            {t.id === "errors"  && errCount > 0                      && <span className="badge err">{errCount}</span>}
            {t.id === "tokens"  && (result?.tokens?.length ?? 0) > 0 && <span className="badge">{result.tokens.length}</span>}
            {t.id === "overview" && result && errCount === 0          && <span className="badge ok">✓</span>}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {loading && <div className="spinner-wrap"><div className="spinner" />Compiling…</div>}
        {!loading && result && (
          <div className="tab-content-enter" key={active} style={{ height: "100%" }}>
            {active === "overview"    && <OverviewTab    r={result} onJumpToLine={onJumpToLine} />}
            {active === "tokens"      && <TokensTab      r={result} />}
            {active === "symtable"    && <SymTab         r={result} />}
            {active === "ast"         && <ASTTab         r={result} onJumpToLine={onJumpToLine} />}
            {active === "cfg"         && <CFGTab         r={result} onJumpToLine={onJumpToLine} />}
            {active === "firstfollow" && <FFTab          r={result} />}
            {active === "parsetable"  && <ParseTab       r={result} />}
            {active === "terminal"    && <TerminalTab    r={result} />}
            {active === "errors"      && <ErrorsTab      r={result} onJumpToLine={onJumpToLine} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared helpers ───────────────────────────────────────────────────────
function Empty({ icon = "⬜", msg }) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <p>{msg}</p>
    </div>
  );
}

function StatBadge({ label, value, color = "info" }) {
  return (
    <div className="ov-card" style={{ minWidth: 110 }}>
      <div className="ov-card-label">{label}</div>
      <div className={`ov-card-value`} style={{ color: `var(--${color})`, fontSize: 22 }}>{value}</div>
    </div>
  );
}

function ttCls(type) {
  if (!type) return "tt-def";
  if (type === "IDENT") return "tt-ident";
  if (["INT_LIT", "FLOAT_LIT", "STRING_LIT", "BOOL_LIT"].includes(type)) return "tt-lit";
  if (["FOR", "IN", "PRINT", "RANGE"].includes(type)) return "tt-kw";
  if (["IF", "ELSE", "ELIF", "WHILE"].includes(type)) return "tt-cond-kw";
  if (["EQ", "NEQ", "LT", "LE", "GT", "GE"].includes(type)) return "tt-cond-op";
  if (["PLUS", "MINUS", "STAR", "SLASH", "MOD", "ASSIGN", "PLUS_ASSIGN", "MINUS_ASSIGN"].includes(type)) return "tt-op";
  if (["NEWLINE", "INDENT", "DEDENT", "EOF", "LPAREN", "RPAREN", "LBRACKET", "RBRACKET", "COMMA", "COLON"].includes(type)) return "tt-struct";
  return "tt-def";
}

// ══════════════════════════════════════════════════════════════════════
//  OVERVIEW TAB
// ══════════════════════════════════════════════════════════════════════
function OverviewTab({ r, onJumpToLine }) {
  const errCount  = (r.lexerErrors?.length ?? 0) + (r.parserErrors?.length ?? 0);
  const tokenCount  = r.tokens?.length ?? 0;
  const symbolCount = r.symbolTable?.length ?? 0;
  const hasAST      = !!r.ast;
  const hasCFG      = !!r.cfg;
  const cfgNodes    = r.cfg?.nodes?.length ?? 0;
  const cfgEdges    = r.cfg?.edges?.length ?? 0;

  // Rough AST depth
  function astDepth(node, d = 0) {
    if (!node) return d;
    const kids = astKids(node);
    if (!kids.length) return d;
    return Math.max(...kids.map(k => astDepth(k, d + 1)));
  }
  const depth = hasAST ? astDepth(r.ast) : 0;

  const stages = [
    { name: "Lexer",        pass: tokenCount > 0,      skip: false },
    { name: "Parser",       pass: hasAST,              skip: false },
    { name: "Symbol Table", pass: symbolCount > 0,     skip: !hasAST },
    { name: "AST",          pass: hasAST,              skip: false },
    { name: "CFG",          pass: hasCFG,              skip: !hasAST },
    { name: "First/Follow", pass: !!r.firstFollow,     skip: false },
    { name: "Parse Table",  pass: !!r.parsingTable,    skip: false },
    { name: "Execution",    pass: !!r.output,          skip: !hasAST },
  ];

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      {/* Stats cards */}
      <div className="overview-grid">
        <div className={`ov-card ${errCount > 0 ? "err" : "ok"}`}>
          <div className="ov-card-label">Errors</div>
          <div className="ov-card-value">{errCount}</div>
          <div className="ov-card-sub">{errCount > 0 ? "click Errors tab" : "clean compile"}</div>
        </div>
        <div className="ov-card info">
          <div className="ov-card-label">Tokens</div>
          <div className="ov-card-value">{tokenCount}</div>
          <div className="ov-card-sub">from lexer</div>
        </div>
        <div className="ov-card cyan">
          <div className="ov-card-label">Symbols</div>
          <div className="ov-card-value">{symbolCount}</div>
          <div className="ov-card-sub">vars declared</div>
        </div>
        <div className="ov-card" style={{ "--c": "var(--purple)" }}>
          <div className="ov-card-label">AST Depth</div>
          <div className="ov-card-value" style={{ color: "var(--purple)" }}>{hasAST ? depth : "—"}</div>
          <div className="ov-card-sub">tree levels</div>
        </div>
        <div className="ov-card" style={{ "--c": "var(--yellow)" }}>
          <div className="ov-card-label">CFG Nodes</div>
          <div className="ov-card-value" style={{ color: "var(--yellow)" }}>{hasCFG ? cfgNodes : "—"}</div>
          <div className="ov-card-sub">{hasCFG ? `${cfgEdges} edges` : "no CFG"}</div>
        </div>
      </div>

      {/* Pipeline stages */}
      <div className="ov-pipeline">
        <h3>Compilation Pipeline</h3>
        <div className="ov-stages">
          {stages.map((s, i) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className={`ov-stage ${s.skip ? "skip" : s.pass ? "pass" : "fail"}`}>
                <span className="ov-stage-icon">{s.skip ? "—" : s.pass ? "✓" : "✕"}</span>
                {s.name}
              </div>
              {i < stages.length - 1 && <span className="ov-arrow">›</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Error preview if any */}
      {errCount > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="sec-label">Errors ({errCount})</div>
          <div className="elist">
            {[...(r.lexerErrors ?? []), ...(r.parserErrors ?? [])].slice(0, 3).map((e, i) => (
              <div key={i} className={`eitem ${e.phase ?? "lexer"}`}>
                <span className="ephase">{e.phase ?? "lexer"}</span>
                <div className="ebody">
                  <div className="emsg">{e.message}</div>
                  {e.line > 0 && (
                    <div className="eline">
                      Line {e.line}
                      {onJumpToLine && (
                        <button className="ejump-btn" onClick={() => onJumpToLine(e.line)}>
                          jump →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {errCount > 3 && (
              <div style={{ fontSize: 12, color: "var(--dim)", paddingTop: 4 }}>
                +{errCount - 3} more — see Errors tab
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  TERMINAL TAB
// ══════════════════════════════════════════════════════════════════════
function TerminalTab({ r }) {
  const output = r.output;
  if (!output) return <Empty icon="🖥️" msg="Execution output not available. Fix syntax errors first." />;
  return (
    <div style={{ height: "100%", background: "#0a0a10", color: "#d1d5db", padding: 16, fontFamily: "var(--mono)", fontSize: 13, overflow: "auto", borderRadius: "var(--r2)", border: "1px solid var(--border)" }}>
      <div style={{ color: "var(--dim)", marginBottom: 12, fontSize: 11 }}># Execution Output:</div>
      {output.map((line, i) => <div key={i}>{line}</div>)}
      {output.length === 0 && <div style={{ color: "var(--dim)", fontStyle: "italic" }}>(No output)</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  TOKENS TAB — table + stream views
// ══════════════════════════════════════════════════════════════════════
const STREAM_SKIP = new Set(["NEWLINE", "INDENT", "DEDENT", "EOF"]);

function TokensTab({ r }) {
  const [view, setView] = useState("table"); // "table" | "stream"
  const tokens = r.tokens ?? [];
  if (!tokens.length) return <Empty icon="🔤" msg="No tokens produced." />;

  // Background and text colors for pill view based on token class
  const pillColors = {
    "tt-ident":   { bg: "rgba(34,211,238,.12)",  color: "var(--cyan)"   },
    "tt-lit":     { bg: "rgba(251,146,60,.12)",  color: "var(--orange)" },
    "tt-kw":      { bg: "rgba(167,139,250,.12)", color: "var(--purple)" },
    "tt-op":      { bg: "rgba(74,222,128,.1)",   color: "var(--green)"  },
    "tt-cond-kw": { bg: "rgba(251,191,36,.12)",  color: "var(--yellow)" },
    "tt-cond-op": { bg: "rgba(244,114,182,.12)", color: "var(--pink)"   },
    "tt-struct":  { bg: "rgba(148,163,184,.08)", color: "var(--muted)"  },
    "tt-def":     { bg: "var(--s3)",             color: "var(--text)"   },
  };

  return (
    <>
      <div className="token-view-toggle">
        <button className={`tvt-btn ${view === "table"  ? "on" : ""}`} onClick={() => setView("table")}>Table</button>
        <button className={`tvt-btn ${view === "stream" ? "on" : ""}`} onClick={() => setView("stream")}>Stream</button>
      </div>

      {view === "table" ? (
        <table className="dtable">
          <thead><tr><th>#</th><th>Type</th><th>Value</th><th>Line</th></tr></thead>
          <tbody>
            {tokens.map((t, i) => (
              <tr key={i}>
                <td className="lnum">{i + 1}</td>
                <td><span className={`tt ${ttCls(t.type)}`}>{t.type}</span></td>
                <td><code className="tval">{t.value === "\\n" ? "↵" : t.value || "—"}</code></td>
                <td className="lnum">{t.line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="token-stream">
          {tokens.filter(t => !STREAM_SKIP.has(t.type)).map((t, i) => {
            const cls    = ttCls(t.type);
            const colors = pillColors[cls] ?? pillColors["tt-def"];
            return (
              <div
                key={i}
                className="tpill"
                style={{
                  background:   colors.bg,
                  color:        colors.color,
                  borderColor:  colors.color + "33",
                }}
                title={`Line ${t.line}`}
              >
                <div className="tpill-type">{t.type}</div>
                <div className="tpill-val">{t.value === "\\n" ? "↵" : t.value || "—"}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  SYMBOL TABLE
// ══════════════════════════════════════════════════════════════════════
function SymTab({ r }) {
  const e = r.symbolTable ?? [];
  if (!e.length) return <Empty icon="📋" msg="No variables declared." />;
  return (
    <table className="dtable">
      <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Scope</th><th>Line</th></tr></thead>
      <tbody>
        {e.map((s, i) => (
          <tr key={i}>
            <td className="lnum">{i + 1}</td>
            <td><code className="sname">{s.name}</code></td>
            <td><span className={`tbadge tb-${s.type}`}>{s.type}</span></td>
            <td>
              <span className={`scbadge sc${Math.min(s.scopeLevel, 2)}`}>
                {s.scopeLevel === 0 ? "global" : `scope · ${s.scopeLevel}`}
              </span>
            </td>
            <td className="lnum">{s.declarationLine}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── PNG Export Helper ──────────────────────────────────────────────────
function exportCytoscapePNG(cy, filename = "diagram.png") {
  if (!cy) return;
  try {
    const pngUri = cy.png({ full: true, scale: 2, bg: "#080810" });
    const a = document.createElement("a");
    a.href = pngUri;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("Failed to export PNG:", err);
  }
}

// ══════════════════════════════════════════════════════════════════════
//  AST — Cytoscape
// ══════════════════════════════════════════════════════════════════════
function ASTTab({ r, onJumpToLine }) {
  const ref   = useRef(null);
  const cyRef = useRef(null);
  const [search, setSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!r.ast || !ref.current) return;
    if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }

    const nodes = [];
    const edges = [];
    let idCounter = 1;

    function traverse(node, parentId = null) {
      if (!node) return;
      const id   = String(idCounter++);
      let label  = astLabel(node);
      const meta = astMeta(node);
      if (meta) label += "\n" + meta;
      const line = node.line || 0;

      nodes.push({ data: { id, label, type: node.nodeType, line, rawNode: node } });
      if (parentId) edges.push({ data: { id: `e${parentId}-${id}`, source: String(parentId), target: id } });

      astKids(node).forEach(kid => traverse(kid, id));
    }

    traverse(r.ast);

    cyRef.current = cytoscape({
      container: ref.current,
      elements:  [...nodes, ...edges],
      style:     astStyle(),
      layout:    { name: "dagre", rankDir: "TB", nodeSep: 40, rankSep: 60, animate: false },
      userZoomingEnabled:   true,
      userPanningEnabled:   true,
      boxSelectionEnabled:  false,
    });

    cyRef.current.ready(() => {
      const cy = cyRef.current;
      cy.nodes().forEach(n => n.style({ width: "label", height: "label" }));
      cy.layout({ name: "dagre", rankDir: "TB", nodeSep: 40, rankSep: 60, animate: false }).run();
      cy.fit(cy.elements(), 36);

      cy.on("tap", "node", evt => {
        setSelectedNode(evt.target.data());
      });
      cy.on("tap", evt => {
        if (evt.target === cy) setSelectedNode(null);
      });
    });

    return () => { if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; } };
  }, [r.ast]);

  // Handle search filtering
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    cy.nodes().removeClass("highlighted");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hits = cy.nodes().filter(n => {
        const lbl = (n.data("label") || "").toLowerCase();
        const tp  = (n.data("type") || "").toLowerCase();
        return lbl.includes(q) || tp.includes(q);
      });
      hits.addClass("highlighted");
      if (hits.length > 0) cy.center(hits);
    }
  }, [search]);

  if (!r.ast) return <Empty icon="🌲" msg="No AST. Check the Errors tab." />;

  const nodeCount = (() => { let n = 0; function c(nd) { if (!nd) return; n++; astKids(nd).forEach(c); } c(r.ast); return n; })();

  return (
    <div className="ast-wrap" style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="ast-toolbar">
        <span className="ast-hint">Scroll = zoom · Drag = pan · Click node to inspect</span>

        <div className="ast-search-box">
          <span style={{ fontSize: 11, color: "var(--dim)" }}>🔍</span>
          <input
            className="ast-search-input"
            type="text"
            placeholder="Search AST…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 11 }}
              onClick={() => setSearch("")}
            >✕</button>
          )}
        </div>

        <div className="ast-badges">
          <span className="badge">{nodeCount} nodes</span>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: "3px 9px" }}
            onClick={() => cyRef.current?.fit(cyRef.current.elements(), 36)}
            title="Reset zoom to fit all nodes"
          >
            ⊞ Fit
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: "3px 9px" }}
            onClick={() => exportCytoscapePNG(cyRef.current, "python_parser_ast.png")}
            title="Export AST diagram as PNG"
          >
            📸 PNG
          </button>
        </div>
      </div>
      <div ref={ref} style={{ flex: 1, width: "100%", position: "relative", minHeight: 300 }} />

      {/* Floating Node Inspector Drawer */}
      {selectedNode && (
        <div className="ast-node-inspector">
          <div>
            <div className="ast-node-title">
              <span>{selectedNode.type}</span>
              {selectedNode.line > 0 && <span className="badge ok">Line {selectedNode.line}</span>}
            </div>
            <div className="ast-node-detail">
              {selectedNode.label.split("\n").join(" · ")}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {selectedNode.line > 0 && onJumpToLine && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={() => onJumpToLine(selectedNode.line)}
              >
                Jump to line {selectedNode.line} →
              </button>
            )}
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: "4px 8px" }}
              onClick={() => setSelectedNode(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function astStyle() {
  return [
    {
      selector: "node",
      style: {
        "width": "label", "height": "label", "padding": "10px 14px",
        "label": "data(label)", "text-valign": "center", "text-halign": "center",
        "text-wrap": "wrap",
        "font-family": "JetBrains Mono,Consolas,monospace",
        "font-size": "11px", "line-height": 1.4, "shape": "roundrectangle",
        "background-color": "#131220", "border-color": "#302e50",
        "border-width": 1.5, "color": "#c8c8e0",
      },
    },
    { selector: "node[type='Program']",    style: { "background-color": "#0c0c22", "border-color": "#818cf8", "color": "#a5b4fc", "font-weight": "bold" } },
    { selector: "node[type='AssignStmt'],node[type='Literal']", style: { "background-color": "#071a0f", "border-color": "#4ade80", "color": "#86efac" } },
    { selector: "node[type='IfStmt'],node[type='ElifStmt'],node[type='ElseStmt'],node[type='WhileStmt'],node[type='ForStmt']", style: { "background-color": "#1a1500", "border-color": "#fbbf24", "color": "#fcd34d" } },
    { selector: "node[type='PrintStmt']",  style: { "background-color": "#1e1b4b", "border-color": "#c084fc", "color": "#e9d5ff" } },
    { selector: "node[type='BinOp']",      style: { "background-color": "#1a0e00", "border-color": "#fb923c", "color": "#fdba74" } },
    { selector: "node[type='Ident']",      style: { "background-color": "#001a1e", "border-color": "#22d3ee", "color": "#67e8f9" } },
    { selector: "node[type='Range']",      style: { "background-color": "#101a0e", "border-color": "#86efac", "color": "#4ade80" } },
    { selector: "node.highlighted",        style: { "background-color": "#2e2005", "border-color": "#fbbf24", "border-width": 3, "color": "#fef08a" } },
    {
      selector: "edge",
      style: {
        "width": 1.5, "line-color": "#302e50",
        "target-arrow-color": "#302e50", "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
  ];
}

function astLabel(n) {
  const op = o => ({ ASSIGN: "=", PLUS_ASSIGN: "+=", MINUS_ASSIGN: "-=" }[o] ?? o);
  switch (n.nodeType) {
    case "Program":    return "Program";
    case "AssignStmt": return `${n.ident}  ${op(n.op)}`;
    case "PrintStmt":  return "print( )";
    case "ForStmt":    return `for ${n.loopVar} in`;
    case "WhileStmt":  return "while";
    case "IfStmt":     return "if";
    case "ElifStmt":   return "elif";
    case "ElseStmt":   return "else";
    case "BinOp":      return n.op;
    case "Ident":      return n.name;
    case "Literal":    return n.rawValue;
    case "ListLit":    return "[ list ]";
    case "Range":      return "range( )";
    case "ExprStmt":   return "Expr";
    case "Index":      return "[ ]";
    default:           return n.nodeType ?? "?";
  }
}

function astMeta(n) {
  const p = [];
  if (n.varType && n.varType !== "UNKNOWN") p.push(n.varType);
  if (n.line) p.push(`ln ${n.line}`);
  return p.join(" · ");
}

function astKids(n) {
  switch (n.nodeType) {
    case "Program":    return n.statements ?? [];
    case "AssignStmt": return [n.expr].filter(Boolean);
    case "PrintStmt":  return n.args ?? [];
    case "ForStmt":    return [n.iterable, ...(n.body ?? [])].filter(Boolean);
    case "WhileStmt":  return [n.condition, ...(n.body ?? [])].filter(Boolean);
    case "IfStmt":     return [n.condition, ...(n.body ?? []), ...(n.elifs ?? []), n.elseStmt].filter(Boolean);
    case "ElifStmt":   return [n.condition, ...(n.body ?? [])].filter(Boolean);
    case "ElseStmt":   return [...(n.body ?? [])].filter(Boolean);
    case "BinOp":      return [n.left, n.right].filter(Boolean);
    case "ListLit":    return n.elements ?? [];
    case "Range":      return n.args ?? [];
    case "ExprStmt":   return [n.expr].filter(Boolean);
    case "Index":      return [n.base, n.index].filter(Boolean);
    default:           return [];
  }
}

function buildExecutionTrace(cfg) {
  if (!cfg?.nodes?.length) return [];
  const nodesById = new Map(cfg.nodes.map(n => [n.id, n]));
  const edgesFrom = new Map();
  (cfg.edges ?? []).forEach(e => {
    if (!edgesFrom.has(e.from)) edgesFrom.set(e.from, []);
    edgesFrom.get(e.from).push(e);
  });

  const entry = cfg.nodes.find(n => n.kind === "ENTRY") || cfg.nodes[0];
  if (!entry) return [];

  const trace = [];
  let curr = entry.id;
  const loopVisits = new Map();
  const maxSteps = 40;

  while (curr !== undefined && trace.length < maxSteps) {
    const node = nodesById.get(curr);
    if (!node) break;
    trace.push({
      nodeId: curr,
      kind: node.kind,
      statements: node.statements ?? [],
      label: cfgLabel(node),
    });

    if (node.kind === "EXIT") break;

    const outEdges = edgesFrom.get(curr) ?? [];
    if (outEdges.length === 0) break;

    const visits = (loopVisits.get(curr) ?? 0) + 1;
    loopVisits.set(curr, visits);

    let nextEdge = outEdges[0];
    if (outEdges.length > 1) {
      if (visits <= 1) {
        nextEdge = outEdges.find(e => e.label === "yes" || e.label === "loop") || outEdges[0];
      } else {
        nextEdge = outEdges.find(e => e.label === "no" || e.label === "exit") || outEdges.find(e => e.label !== "yes" && e.label !== "loop") || outEdges[0];
      }
    }
    curr = nextEdge.to;
  }
  return trace;
}

// ══════════════════════════════════════════════════════════════════════
//  CFG — Cytoscape + Interactive Simulation Engine
// ══════════════════════════════════════════════════════════════════════
function CFGTab({ r, onJumpToLine }) {
  const ref   = useRef(null);
  const cyRef = useRef(null);

  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);
  const traceRef = useRef([]);

  useEffect(() => {
    if (!r.cfg || !ref.current) return;
    if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }

    let { nodes, edges } = r.cfg;

    // Remove empty merge blocks for cleaner connections
    let refinedEdges = [...edges];
    const refinedNodes = [];
    nodes.forEach(n => {
      if (n.kind === "BLOCK" && (!n.statements || n.statements.length === 0)) {
        const inEdges  = refinedEdges.filter(e => String(e.to) === String(n.id));
        const outEdges = refinedEdges.filter(e => String(e.from) === String(n.id));
        refinedEdges = refinedEdges.filter(e => String(e.to) !== String(n.id) && String(e.from) !== String(n.id));
        inEdges.forEach(ie => outEdges.forEach(oe => {
          refinedEdges.push({ from: ie.from, to: oe.to, label: ie.label || oe.label });
        }));
      } else {
        refinedNodes.push(n);
      }
    });

    const elements = [
      ...refinedNodes.map(n => ({ data: { id: String(n.id), label: cfgLabel(n), kind: n.kind, raw: n } })),
      ...refinedEdges.map((e, i) => ({ data: { id: `e${i}`, source: String(e.from), target: String(e.to), label: e.label ?? "" } })),
    ];

    cyRef.current = cytoscape({
      container: ref.current,
      elements,
      style:  cfgStyle(),
      layout: { name: "dagre", rankDir: "TB", nodeSep: 60, rankSep: 60, padding: 32, animate: false },
      userZoomingEnabled:   true,
      userPanningEnabled:   true,
      boxSelectionEnabled:  false,
    });

    cyRef.current.ready(() => {
      const cy = cyRef.current;
      cy.nodes().forEach(n => n.style({ width: "label", height: "label" }));
      cy.layout({ name: "dagre", rankDir: "TB", nodeSep: 60, rankSep: 60, padding: 32, animate: false }).run();
      cy.fit(cy.elements(), 36);

      cy.on("tap", "node", evt => {
        const nd = evt.target.data("raw");
        if (nd && nd.statements && nd.statements.length > 0 && onJumpToLine && r.tokens) {
          const firstWord = nd.statements[0].trim().split(/[\s(=><]/)[0];
          const matchTok = r.tokens.find(t => t.value === firstWord && t.line > 0);
          if (matchTok) onJumpToLine(matchTok.line);
        }
      });
    });

    // Build execution trace
    traceRef.current = buildExecutionTrace({ nodes: refinedNodes, edges: refinedEdges });
    setStepIdx(0);
    setIsPlaying(false);

    return () => {
      if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }
    };
  }, [r.cfg]);

  // Update highlighted node on step change
  useEffect(() => {
    if (!cyRef.current || !traceRef.current.length) return;
    const cy = cyRef.current;
    cy.elements().removeClass("sim-active sim-edge-active");

    const curr = traceRef.current[stepIdx];
    if (curr) {
      const activeNode = cy.$id(String(curr.nodeId));
      if (activeNode.length > 0) {
        activeNode.addClass("sim-active");
        cy.center(activeNode);
      }

      if (stepIdx > 0) {
        const prev = traceRef.current[stepIdx - 1];
        const edge = cy.edges().filter(e => e.data("source") === String(prev.nodeId) && e.data("target") === String(curr.nodeId));
        edge.addClass("sim-edge-active");
      }
    }
  }, [stepIdx]);

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setStepIdx(prev => {
          if (prev >= traceRef.current.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying]);

  if (!r.cfg) return <Empty icon="⬡" msg="No CFG. Check the Errors tab." />;

  const trace = traceRef.current;
  const currentStep = trace[stepIdx];

  const handleStepForward = () => {
    if (stepIdx < trace.length - 1) setStepIdx(v => v + 1);
  };
  const handleStepBack = () => {
    if (stepIdx > 0) setStepIdx(v => v - 1);
  };
  const handleReset = () => {
    setIsPlaying(false);
    setStepIdx(0);
  };

  return (
    <div className="cfg-wrap" style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="cfg-toolbar">
        <div className="cfg-legend">
          <span className="cfg-ld cfg-ld-entry" />ENTRY
          <span className="cfg-ld cfg-ld-block" />BLOCK
          <span className="cfg-ld cfg-ld-for"   />FOR/WHILE
          <span className="cfg-ld cfg-ld-exit"  />EXIT
        </div>

        {/* Step-Through Simulation Bar */}
        {trace.length > 0 && (
          <div className="cfg-step-bar">
            <button
              className="cfg-step-btn"
              onClick={handleReset}
              title="Reset simulation"
              disabled={stepIdx === 0 && !isPlaying}
            >
              ↺ Reset
            </button>
            <button
              className="cfg-step-btn"
              onClick={handleStepBack}
              disabled={stepIdx === 0}
              title="Previous execution step"
            >
              ⏮ Prev
            </button>
            <button
              className="cfg-step-btn play"
              onClick={() => setIsPlaying(v => !v)}
              title={isPlaying ? "Pause simulation" : "Auto-play execution trace"}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <button
              className="cfg-step-btn"
              onClick={handleStepForward}
              disabled={stepIdx >= trace.length - 1}
              title="Next execution step"
            >
              Step ⏭
            </button>
            <span className="cfg-step-indicator">
              Step {stepIdx + 1} / {trace.length}
            </span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge">{r.cfg.nodes.length}N · {r.cfg.edges.length}E</span>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: "3px 9px" }}
            onClick={() => cyRef.current?.fit(cyRef.current.elements(), 36)}
            title="Fit graph to view"
          >
            ⊞ Fit
          </button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 11, padding: "3px 9px" }}
            onClick={() => exportCytoscapePNG(cyRef.current, "python_parser_cfg.png")}
            title="Export CFG diagram as PNG"
          >
            📸 PNG
          </button>
        </div>
      </div>

      <div className="cfg-container" ref={ref} />

      {/* Floating Simulation Step HUD */}
      {currentStep && (
        <div className="cfg-step-hud">
          <div className="cfg-step-hud-left">
            <span className="cfg-step-badge">Step {stepIdx + 1}</span>
            <div>
              <div className="cfg-step-hud-text">
                [{currentStep.kind}] {currentStep.statements?.join(" | ") || currentStep.label}
              </div>
              <div className="cfg-step-hud-sub">
                {currentStep.kind === "ENTRY" && "Program execution entry point"}
                {currentStep.kind === "EXIT"  && "Program execution completed"}
                {currentStep.kind.includes("CONDITION") && "Branch decision evaluated — loop/branch condition"}
                {currentStep.kind === "BLOCK" && "Sequential statement block"}
              </div>
            </div>
          </div>
          {currentStep.statements?.length > 0 && onJumpToLine && r.tokens && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: "4px 10px" }}
              onClick={() => {
                const firstWord = currentStep.statements[0].trim().split(/[\s(=><]/)[0];
                const matchTok = r.tokens.find(t => t.value === firstWord && t.line > 0);
                if (matchTok) onJumpToLine(matchTok.line);
              }}
            >
              Highlight code →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function cfgLabel(n) {
  if (n.kind === "ENTRY") return "ENTRY";
  if (n.kind === "EXIT")  return "EXIT";
  if (n.kind === "FOR_CONDITION")   return (n.statements?.[0] ?? "for …").replace(/^for /, "⟳ for ");
  if (n.kind === "IF_CONDITION")    return (n.statements?.[0] ?? "if …").replace(/^if /, "⬦ if ").replace(/^elif /, "⬦ elif ");
  if (n.kind === "WHILE_CONDITION") return (n.statements?.[0] ?? "while …").replace(/^while /, "⟳ while ");
  return (n.statements ?? []).map(s => s.length > 22 ? s.slice(0, 20) + "…" : s).join("\n\n");
}

function cfgStyle() {
  return [
    {
      selector: "node",
      style: {
        "width": "label", "height": "label", "padding": "16px 18px",
        "label": "data(label)", "text-valign": "center", "text-halign": "center",
        "text-wrap": "wrap", "text-overflow-wrap": "anywhere", "text-max-width": "140px",
        "font-family": "JetBrains Mono,Consolas,monospace",
        "font-size": "11px", "line-height": 1.4, "shape": "roundrectangle",
        "background-color": "#131220", "border-color": "#302e50", "border-width": 1.5, "color": "#c8c8e0",
      },
    },
    { selector: "node[kind='ENTRY']", style: { "background-color": "#0c0c22", "border-color": "#818cf8", "border-width": 2, "color": "#a5b4fc", "font-weight": "bold", "font-size": "12px" } },
    { selector: "node[kind='EXIT']",  style: { "background-color": "#071a0f", "border-color": "#4ade80", "border-width": 2, "color": "#86efac", "font-weight": "bold", "font-size": "12px" } },
    { selector: "node[kind='FOR_CONDITION'],node[kind='IF_CONDITION'],node[kind='WHILE_CONDITION']", style: { "shape": "diamond", "background-color": "#1a1500", "border-color": "#fbbf24", "border-width": 2, "color": "#fcd34d", "padding": "22px 20px", "text-max-width": "140px" } },
    { selector: "node[kind='BLOCK']", style: { "text-halign": "center", "text-valign": "center", "padding": "14px 16px", "text-max-width": "140px" } },
    { selector: "node.sim-active",    style: { "border-color": "#22d3ee", "border-width": 3.5, "background-color": "#083344", "color": "#ffffff" } },
    {
      selector: "edge",
      style: {
        "width": 1.5, "line-color": "#302e50",
        "target-arrow-color": "#302e50", "target-arrow-shape": "triangle",
        "curve-style": "bezier", "font-size": "10px",
        "font-family": "JetBrains Mono,monospace", "color": "#64748b",
        "label": "data(label)", "text-background-color": "#060614",
        "text-background-opacity": 0.9, "text-background-padding": "3px",
        "text-rotation": "autorotate",
      },
    },
    { selector: "edge[label='loop']", style: { "line-color": "#fbbf24", "target-arrow-color": "#fbbf24", "line-style": "dashed", "line-dash-pattern": [6, 3], "color": "#fbbf24" } },
    { selector: "edge[label='yes']",  style: { "line-color": "#4ade80", "target-arrow-color": "#4ade80", "color": "#4ade80" } },
    { selector: "edge[label='no']",   style: { "line-color": "#f87171", "target-arrow-color": "#f87171", "color": "#f87171" } },
    { selector: "edge[label='exit']", style: { "line-color": "#4ade80", "target-arrow-color": "#4ade80" } },
    { selector: "edge.sim-edge-active", style: { "line-color": "#22d3ee", "target-arrow-color": "#22d3ee", "width": 3, "color": "#22d3ee" } },
  ];
}

// ══════════════════════════════════════════════════════════════════════
//  FIRST / FOLLOW
// ══════════════════════════════════════════════════════════════════════
function FFTab({ r }) {
  if (!r.firstFollow) return <Empty icon="∑" msg="First/Follow sets not available. The backend may not have returned this data." />;
  const { first, follow } = r.firstFollow;
  return (
    <>
      <FFSection title="FIRST Sets"  sets={first}  />
      <FFSection title="FOLLOW Sets" sets={follow} />
    </>
  );
}

function FFSection({ title, sets }) {
  return (
    <div className="ff-section">
      <h3>{title}</h3>
      {Object.entries(sets ?? {}).filter(([, toks]) => toks.size > 0 || (Array.isArray(toks) && toks.length > 0)).map(([nt, toks]) => (
        <div key={nt} className="ff-row">
          <span className="ff-nt">{nt}</span>
          <span className="ff-arr">→</span>
          <div className="ff-set">
            {[...toks].map(tok => (
              <span key={tok} className={`fftok ${tok === "ε" ? "eps" : tok === "$" ? "eof" : ""}`}>{tok}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  PARSE TABLE
// ══════════════════════════════════════════════════════════════════════
const GRAMMAR = [
  [0, "program", ["stmt_list"]], [1, "stmt_list", ["stmt", "stmt_list"]], [2, "stmt_list", ["ε"]],
  [3, "stmt", ["assign_stmt"]], [4, "stmt", ["print_stmt"]], [5, "stmt", ["for_stmt"]],
  [6, "stmt", ["while_stmt"]], [7, "stmt", ["if_stmt"]],
  [8, "assign_stmt", ["IDENT", "assign_op", "expr", "NEWLINE"]],
  [9, "assign_op", ["ASSIGN"]], [10, "assign_op", ["PLUS_ASSIGN"]], [11, "assign_op", ["MINUS_ASSIGN"]],
  [12, "print_stmt", ["PRINT", "LPAREN", "expr_list", "RPAREN", "NEWLINE"]],
  [13, "for_stmt", ["FOR", "IDENT", "IN", "expr", "COLON", "NEWLINE", "INDENT", "stmt_list", "DEDENT"]],
  [14, "expr_list", ["expr", "expr_list_tail"]], [15, "expr_list_tail", ["COMMA", "expr", "expr_list_tail"]], [16, "expr_list_tail", ["ε"]],
  [17, "expr", ["term", "expr_prime"]], [18, "expr_prime", ["PLUS", "term", "expr_prime"]], [19, "expr_prime", ["MINUS", "term", "expr_prime"]], [20, "expr_prime", ["ε"]],
  [21, "term", ["factor", "term_prime"]], [22, "term_prime", ["STAR", "factor", "term_prime"]], [23, "term_prime", ["SLASH", "factor", "term_prime"]], [24, "term_prime", ["ε"]],
  [25, "factor", ["LPAREN", "expr", "RPAREN"]], [26, "factor", ["IDENT", "factor_tail"]],
  [27, "factor_tail", ["LBRACKET", "expr", "RBRACKET"]], [28, "factor_tail", ["ε"]], [29, "factor", ["literal"]],
  [30, "literal", ["INT_LIT"]], [31, "literal", ["FLOAT_LIT"]], [32, "literal", ["STRING_LIT"]], [33, "literal", ["BOOL_LIT"]], [34, "literal", ["list_lit"]],
  [35, "list_lit", ["LBRACKET", "list_contents"]], [36, "list_contents", ["expr_list", "RBRACKET"]], [37, "list_contents", ["RBRACKET"]],
  [38, "range_stmt", ["RANGE", "LPAREN", "expr_list", "RPAREN"]], [39, "factor", ["range_stmt"]],
  [40, "expr_prime", ["EQ", "term", "expr_prime"]], [41, "expr_prime", ["NEQ", "term", "expr_prime"]],
  [42, "expr_prime", ["LT", "term", "expr_prime"]], [43, "expr_prime", ["LE", "term", "expr_prime"]],
  [44, "expr_prime", ["GT", "term", "expr_prime"]], [45, "expr_prime", ["GE", "term", "expr_prime"]],
  [46, "condition_stmt", ["IDENT", "condition_op", "expr", "NEWLINE"]], [47, "condition_op", ["EQ"]], [48, "condition_op", ["NEQ"]],
  [49, "condition_op", ["LT"]], [50, "condition_op", ["LE"]], [51, "condition_op", ["GT"]], [52, "condition_op", ["GE"]],
  [53, "while_stmt", ["WHILE", "expr", "COLON", "NEWLINE", "INDENT", "stmt_list", "DEDENT"]],
  [54, "term_prime", ["MOD", "factor", "term_prime"]],
  [55, "if_stmt", ["IF", "expr", "COLON", "NEWLINE", "INDENT", "stmt_list", "DEDENT", "optional_else"]],
  [56, "optional_else", ["elif_stmt"]], [57, "optional_else", ["else_stmt"]], [58, "optional_else", ["ε"]],
  [59, "elif_stmt", ["ELIF", "expr", "COLON", "NEWLINE", "INDENT", "stmt_list", "DEDENT", "optional_else"]],
  [60, "else_stmt", ["ELSE", "COLON", "NEWLINE", "INDENT", "stmt_list", "DEDENT"]],
];

const NT_SET = new Set([
  "program","stmt_list","stmt","assign_stmt","assign_op","condition_stmt","condition_op",
  "print_stmt","for_stmt","while_stmt","range_stmt","if_stmt","elif_stmt","else_stmt","optional_else",
  "expr_list","expr_list_tail","expr","expr_prime","term","term_prime",
  "factor","factor_tail","literal","list_lit","list_contents",
]);

function ParseTab({ r }) {
  if (!r.parsingTable) return <Empty icon="📊" msg="Parse table not available. The backend may not have returned this data." />;
  const { table, conflicts } = r.parsingTable;
  const nts   = Object.keys(table);
  const tSet  = new Set();
  Object.values(table).forEach(row => Object.keys(row).forEach(t => tSet.add(t)));
  const terms = [...tSet].sort();

  return (
    <>
      {conflicts?.length > 0 && (
        <div className="conflict-box">⚠ {conflicts.length} LL(1) conflict(s): {conflicts.join(" | ")}</div>
      )}

      <p className="sec-label">Grammar Productions</p>
      <div className="glist">
        {GRAMMAR.map(([idx, lhs, rhs]) => (
          <div key={idx} className="grule">
            <span className="gnum">P{idx}</span>
            <span className="glhs">{lhs}</span>
            <span className="garr">→</span>
            <span>
              {rhs.map((s, i) => (
                <span key={i} style={{
                  color:       NT_SET.has(s) ? "var(--cyan)" : s === "ε" ? "var(--yellow)" : "var(--orange)",
                  marginRight: 6, fontFamily: "var(--mono)", fontSize: 12,
                }}>{s}</span>
              ))}
            </span>
          </div>
        ))}
      </div>

      <p className="sec-label" style={{ marginTop: 22 }}>LL(1) Parsing Table</p>
      <div className="ptable-wrap">
        <table className="ptable">
          <thead>
            <tr>
              <th>NT \ T</th>
              {terms.map(t => <th key={t}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {nts.map(nt => (
              <tr key={nt}>
                <td>{nt}</td>
                {terms.map(t => {
                  const p = table[nt]?.[t];
                  return <td key={t} className={p ? "hit" : ""}>{p ? `P${p.index}` : ""}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  ERRORS
// ══════════════════════════════════════════════════════════════════════
function ErrorsTab({ r, onJumpToLine }) {
  const lex    = r.lexerErrors  ?? [];
  const parser = r.parserErrors ?? [];

  if (!lex.length && !parser.length) {
    return (
      <div className="ok-banner">
        <span style={{ fontSize: 22 }}>✅</span>
        <div>
          <strong>No errors found</strong>
          <div style={{ fontSize: 12, marginTop: 3, opacity: .75 }}>Compilation completed successfully.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="elist">
      {lex.map((e, i) => (
        <div key={`l${i}`} className="eitem lexer">
          <span className="ephase">Lexer</span>
          <div className="ebody">
            <div className="emsg">{e.message}</div>
            <div className="eline">
              Line {e.line}
              {onJumpToLine && e.line > 0 && (
                <button className="ejump-btn" onClick={() => onJumpToLine(e.line)}>jump to line →</button>
              )}
            </div>
          </div>
        </div>
      ))}
      {parser.map((e, i) => (
        <div key={`p${i}`} className={`eitem ${e.phase ?? "syntax"}`}>
          <span className="ephase">{e.phase ?? "syntax"}</span>
          <div className="ebody">
            <div className="emsg">{e.message}</div>
            <div className="eline">
              {e.line > 0 ? `Line ${e.line}` : ""}
              {onJumpToLine && e.line > 0 && (
                <button className="ejump-btn" onClick={() => onJumpToLine(e.line)}>jump to line →</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}