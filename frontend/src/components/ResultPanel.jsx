import { useState, useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
cytoscape.use(cytoscapeDagre);

const TABS = [
  { id: "tokens",      label: "Tokens",       icon: "🔤" },
  { id: "symtable",    label: "Sym Table",    icon: "📋" },
  { id: "ast",         label: "AST",          icon: "🌲" },
  { id: "cfg",         label: "CFG",          icon: "⬡"  },
  { id: "firstfollow", label: "First/Follow", icon: "∑"  },
  { id: "parsetable",  label: "Parse Table",  icon: "📊" },
  { id: "errors",      label: "Errors",       icon: "⚠"  },
];

export default function ResultPanel({ result, loading, defaultTab = "tokens" }) {
  const [active, setActive] = useState(defaultTab);
  useEffect(() => { setActive(defaultTab); }, [defaultTab]);

  const errorCount = result
    ? (result.lexerErrors?.length ?? 0) + (result.parserErrors?.length ?? 0)
    : 0;

  return (
    <div className="results-pane">
      <div className="tabs-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${active === tab.id ? "active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.id === "errors" && errorCount > 0 && (
              <span className="tab-badge error">{errorCount}</span>
            )}
            {tab.id === "tokens" && result?.tokens?.length > 0 && (
              <span className="tab-badge">{result.tokens.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {loading && <Spinner />}
        {!loading && result && (
          <>
            {active === "tokens"      && <TokensTab      data={result} />}
            {active === "symtable"    && <SymTableTab    data={result} />}
            {active === "ast"         && <ASTTab         data={result} />}
            {active === "cfg"         && <CFGTab         data={result} />}
            {active === "firstfollow" && <FirstFollowTab data={result} />}
            {active === "parsetable"  && <ParseTableTab  data={result} />}
            {active === "errors"      && <ErrorsTab      data={result} />}
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" />Compiling…</div>;
}

function Empty({ icon = "⬜", msg }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <p>{msg}</p>
    </div>
  );
}

function tokenCls(type) {
  if (!type) return "tt-default";
  if (type === "IDENT") return "tt-ident";
  if (["INT_LIT","FLOAT_LIT","STRING_LIT","BOOL_LIT"].includes(type)) return "tt-literal";
  if (["FOR","IN","PRINT"].includes(type)) return "tt-keyword";
  if (["PLUS","MINUS","STAR","SLASH","ASSIGN","PLUS_ASSIGN","MINUS_ASSIGN"].includes(type)) return "tt-operator";
  if (["NEWLINE","INDENT","DEDENT","EOF","LPAREN","RPAREN","LBRACKET","RBRACKET","COMMA","COLON"].includes(type)) return "tt-struct";
  return "tt-default";
}

// ── Tokens ────────────────────────────────────────────────────────────────
function TokensTab({ data }) {
  const tokens = data.tokens ?? [];
  if (!tokens.length) return <Empty icon="🔤" msg="No tokens produced." />;
  return (
    <table className="data-table">
      <thead><tr><th>#</th><th>Type</th><th>Value</th><th>Line</th></tr></thead>
      <tbody>
        {tokens.map((t, i) => (
          <tr key={i}>
            <td className="line-num">{i + 1}</td>
            <td><span className={`token-type ${tokenCls(t.type)}`}>{t.type}</span></td>
            <td><code className="token-val">{t.value === "\\n" ? "↵" : t.value || "—"}</code></td>
            <td className="line-num">{t.line}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Symbol table ──────────────────────────────────────────────────────────
function SymTableTab({ data }) {
  const entries = data.symbolTable ?? [];
  if (!entries.length) return <Empty icon="📋" msg="No variables declared." />;
  return (
    <table className="data-table">
      <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Scope</th><th>Declared</th></tr></thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={i}>
            <td className="line-num">{i + 1}</td>
            <td><code className="sym-name">{e.name}</code></td>
            <td><span className={`type-badge type-${e.type}`}>{e.type}</span></td>
            <td>
              <span className={`scope-badge scope-${Math.min(e.scopeLevel, 2)}`}>
                {e.scopeLevel === 0 ? "global" : `loop · ${e.scopeLevel}`}
              </span>
            </td>
            <td className="line-num">line {e.declarationLine}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── AST ───────────────────────────────────────────────────────────────────
function ASTTab({ data }) {
  if (!data.ast) return <Empty icon="🌲" msg="No AST produced. Check the Errors tab." />;
  return (
    <div className="ast-root">
      <div className="ast-legend">
        {[
          ["Program",     "ast-Program"],
          ["Assign",      "ast-AssignStmt"],
          ["Print",       "ast-PrintStmt"],
          ["For",         "ast-ForStmt"],
          ["BinOp",       "ast-BinOp"],
          ["Ident / Lit", "ast-Ident"],
        ].map(([label, cls]) => (
          <span key={label} className={`ast-legend-item ast-tag ${cls}`}>{label}</span>
        ))}
      </div>
      <div className="ast-tree">
        <ASTNode node={data.ast} depth={0} isLast={true} prefix="" />
      </div>
    </div>
  );
}

function ASTNode({ node, depth, isLast, prefix }) {
  const [open, setOpen] = useState(true);
  if (!node) return null;

  const children = nodeChildren(node);
  const hasKids  = children.length > 0;
  const connector = isLast ? "└─ " : "├─ ";
  const childPfx  = prefix + (isLast ? "   " : "│  ");

  return (
    <div className="ast-node">
      <div
        className={`ast-row ${hasKids ? "ast-row--clickable" : ""}`}
        onClick={() => hasKids && setOpen(o => !o)}
      >
        <span className="ast-prefix">
          {depth > 0 && (
            <span className="ast-branch">
              {prefix.split("").map((ch, i) => (
                <span key={i} style={{
                  color: ch === "│" ? "var(--border2)" : "transparent",
                  fontFamily: "var(--mono)",
                }}>
                  {ch === "│" ? "│  " : "\u00a0\u00a0\u00a0"}
                </span>
              ))}
              <span className="ast-conn">{connector}</span>
            </span>
          )}
        </span>
        {hasKids && <span className="ast-toggle">{open ? "▾" : "▸"}</span>}
        <span className={`ast-tag ${astTagCls(node.nodeType)}`}>{nodeLabel(node)}</span>
        <span className="ast-meta">{nodeMeta(node)}</span>
      </div>

      {hasKids && open && (
        <div className="ast-children">
          {children.map((child, i) => (
            <ASTNode
              key={i}
              node={child}
              depth={depth + 1}
              isLast={i === children.length - 1}
              prefix={childPfx}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function astTagCls(t) {
  return {
    Program: "ast-Program", AssignStmt: "ast-AssignStmt",
    PrintStmt: "ast-PrintStmt", ForStmt: "ast-ForStmt",
    BinOp: "ast-BinOp", Ident: "ast-Ident",
    Literal: "ast-Literal", ListLit: "ast-ListLit",
  }[t] ?? "ast-default";
}

function nodeLabel(n) {
  const opStr = op => ({ ASSIGN:"=", PLUS_ASSIGN:"+=", MINUS_ASSIGN:"-=" }[op] ?? op);
  switch (n.nodeType) {
    case "Program":    return "Program";
    case "AssignStmt": return `${n.ident}  ${opStr(n.op)}`;
    case "PrintStmt":  return "print( )";
    case "ForStmt":    return `for  ${n.loopVar}  in`;
    case "BinOp":      return n.op;
    case "Ident":      return n.name;
    case "Literal":    return n.rawValue;
    case "ListLit":    return "[ list ]";
    default:           return n.nodeType ?? "?";
  }
}

function nodeMeta(n) {
  const parts = [];
  if (n.varType && n.varType !== "UNKNOWN") parts.push(n.varType);
  if (n.line)                               parts.push(`line ${n.line}`);
  return parts.join("  ·  ");
}

function nodeChildren(n) {
  switch (n.nodeType) {
    case "Program":    return n.statements ?? [];
    case "AssignStmt": return [n.expr].filter(Boolean);
    case "PrintStmt":  return n.args ?? [];
    case "ForStmt":    return [n.iterable, ...(n.body ?? [])].filter(Boolean);
    case "BinOp":      return [n.left, n.right].filter(Boolean);
    case "ListLit":    return n.elements ?? [];
    default:           return [];
  }
}

// ── CFG ───────────────────────────────────────────────────────────────────
function CFGTab({ data }) {
  const containerRef = useRef(null);
  const cyRef        = useRef(null);

  useEffect(() => {
    if (!data.cfg || !containerRef.current) return;
    if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }

    const { nodes, edges } = data.cfg;
    const elements = [
      ...nodes.map(n => ({ data: { id: String(n.id), label: cfgLabel(n), kind: n.kind } })),
      ...edges.map((e, i) => ({ data: { id: `e${i}`, source: String(e.from), target: String(e.to), label: e.label ?? "" } })),
    ];

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: cfgStyle(),
      layout: { name: "dagre", rankDir: "TB", nodeSep: 70, rankSep: 55, padding: 28, animate: false },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cyRef.current.fit(cyRef.current.elements(), 32);
    return () => { if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; } };
  }, [data.cfg]);

  if (!data.cfg) return <Empty icon="⬡" msg="No CFG produced. Check the Errors tab." />;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="cfg-info-bar">
        <span className="cfg-legend-dot cfg-entry" />ENTRY
        <span className="cfg-legend-dot cfg-block" />BLOCK
        <span className="cfg-legend-dot cfg-for"   />FOR CONDITION
        <span className="cfg-legend-dot cfg-exit"  />EXIT
        <span style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: 11 }}>
          {data.cfg.nodes.length} nodes · {data.cfg.edges.length} edges · scroll to zoom
        </span>
      </div>
      <div className="cfg-container" ref={containerRef} />
    </div>
  );
}

function cfgLabel(n) {
  if (n.kind === "ENTRY") return "ENTRY";
  if (n.kind === "EXIT")  return "EXIT";
  if (n.kind === "FOR_CONDITION") return n.statements?.[0] ?? "for …";
  return (n.statements ?? []).join("\n") || String(n.id);
}

function cfgStyle() {
  return [
    {
      selector: "node",
      style: {
        "background-color": "#161b22",
        "border-color":     "#30363d",
        "border-width":      1.5,
        "color":            "#c9d1d9",
        "label":            "data(label)",
        "text-valign":      "center",
        "text-halign":      "center",
        "font-family":      "JetBrains Mono, Consolas, monospace",
        "font-size":         11,
        "text-wrap":        "wrap",
        "text-max-width":    180,
        "width":            "label",
        "height":           "label",
        "padding":           14,
        "shape":            "roundrectangle",
      },
    },
    {
      selector: "node[kind='ENTRY']",
      style: {
        "background-color": "#0d2139",
        "border-color":     "#4493f8",
        "border-width":      2,
        "color":            "#79c0ff",
        "font-weight":      "bold",
        "font-size":         12,
      },
    },
    {
      selector: "node[kind='EXIT']",
      style: {
        "background-color": "#0d2013",
        "border-color":     "#3fb950",
        "border-width":      2,
        "color":            "#56d364",
        "font-weight":      "bold",
        "font-size":         12,
      },
    },
    {
      selector: "node[kind='FOR_CONDITION']",
      style: {
        "background-color": "#1e1a00",
        "border-color":     "#d29922",
        "border-width":      2,
        "color":            "#e3b341",
        "shape":            "diamond",
        "padding":           20,
      },
    },
    {
      selector: "node[kind='BLOCK']",
      style: {
        "background-color": "#161b22",
        "border-color":     "#3d444d",
        "text-halign":      "left",
        "padding-left":      14,
        "padding-right":     14,
      },
    },
    {
      selector: "edge",
      style: {
        "width":              1.5,
        "line-color":         "#3d444d",
        "target-arrow-color": "#3d444d",
        "target-arrow-shape": "triangle",
        "curve-style":        "bezier",
        "font-size":           10,
        "font-family":        "JetBrains Mono, monospace",
        "color":              "#8b949e",
        "label":              "data(label)",
        "text-background-color":   "#0d1117",
        "text-background-opacity":  0.85,
        "text-background-padding": "3px",
        "text-rotation":      "autorotate",
      },
    },
    {
      selector: "edge[label='loop']",
      style: {
        "line-color":         "#d29922",
        "target-arrow-color": "#d29922",
        "line-style":         "dashed",
        "line-dash-pattern":  [6, 3],
        "color":              "#d29922",
      },
    },
    {
      selector: "edge[label='exit']",
      style: {
        "line-color":         "#3fb950",
        "target-arrow-color": "#3fb950",
      },
    },
  ];
}

// ── First/Follow ──────────────────────────────────────────────────────────
function FirstFollowTab({ data }) {
  if (!data.firstFollow) return <Empty icon="∑" msg="FIRST/FOLLOW sets not available." />;
  const { first, follow } = data.firstFollow;
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
      {Object.entries(sets ?? {}).map(([nt, toks]) => (
        <div key={nt} className="ff-row">
          <span className="ff-nt">{nt}</span>
          <span className="ff-eq">→</span>
          <div className="ff-set">
            {[...toks].map(tok => (
              <span key={tok} className={`ff-token ${tok === "ε" ? "epsilon" : tok === "$" ? "eof" : ""}`}>
                {tok}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Parse table ───────────────────────────────────────────────────────────
const GRAMMAR_RULES = [
  [0,"program",["stmt_list"]],
  [1,"stmt_list",["stmt","stmt_list"]],
  [2,"stmt_list",["ε"]],
  [3,"stmt",["assign_stmt"]],
  [4,"stmt",["print_stmt"]],
  [5,"stmt",["for_stmt"]],
  [6,"assign_stmt",["IDENT","assign_op","expr","NEWLINE"]],
  [7,"assign_op",["="]],
  [8,"assign_op",["+="]],
  [9,"assign_op",["-="]],
  [10,"print_stmt",["PRINT","(","expr_list",")","NEWLINE"]],
  [11,"for_stmt",["FOR","IDENT","IN","expr",":","NEWLINE","INDENT","stmt_list","DEDENT"]],
  [12,"expr_list",["expr","expr_list_tail"]],
  [13,"expr_list_tail",["COMMA","expr","expr_list_tail"]],
  [14,"expr_list_tail",["ε"]],
  [15,"expr",["term","expr_prime"]],
  [16,"expr_prime",["+","term","expr_prime"]],
  [17,"expr_prime",["-","term","expr_prime"]],
  [18,"expr_prime",["ε"]],
  [19,"term",["factor","term_prime"]],
  [20,"term_prime",["*","factor","term_prime"]],
  [21,"term_prime",["/","factor","term_prime"]],
  [22,"term_prime",["ε"]],
  [23,"factor",["(","expr",")"]],
  [24,"factor",["IDENT"]],
  [25,"factor",["literal"]],
  [26,"literal",["INT_LIT"]],
  [27,"literal",["FLOAT_LIT"]],
  [28,"literal",["STRING_LIT"]],
  [29,"literal",["BOOL_LIT"]],
  [30,"literal",["list_lit"]],
  [31,"list_lit",["[","expr_list","]"]],
  [32,"list_lit",["[","]"]],
];

const NT_SET = new Set([
  "program","stmt_list","stmt","assign_stmt","assign_op","print_stmt",
  "for_stmt","expr_list","expr_list_tail","expr","expr_prime",
  "term","term_prime","factor","literal","list_lit",
]);

function ParseTableTab({ data }) {
  if (!data.parsingTable) return <Empty icon="📊" msg="Parsing table not available." />;
  const { table, conflicts } = data.parsingTable;
  const nts     = Object.keys(table);
  const termSet = new Set();
  Object.values(table).forEach(row => Object.keys(row).forEach(t => termSet.add(t)));
  const terminals = [...termSet].sort();

  return (
    <>
      {conflicts?.length > 0 && (
        <div className="conflict-banner">
          ⚠ {conflicts.length} LL(1) conflict{conflicts.length > 1 ? "s" : ""}: {conflicts.join(" | ")}
        </div>
      )}

      <p className="section-label">Grammar Productions</p>
      <div className="grammar-list">
        {GRAMMAR_RULES.map(([idx, lhs, rhs]) => (
          <div key={idx} className="grammar-rule">
            <span className="grammar-num">P{idx}</span>
            <span className="grammar-lhs">{lhs}</span>
            <span className="grammar-arrow">→</span>
            <span>
              {rhs.map((sym, i) => (
                <span key={i} style={{
                  color: NT_SET.has(sym) ? "var(--cyan)" : sym === "ε" ? "var(--yellow)" : "var(--orange)",
                  marginRight: 6,
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                }}>
                  {sym}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>

      <p className="section-label" style={{ marginTop: 24 }}>LL(1) Parsing Table</p>
      <div className="parse-table-wrap">
        <table className="parse-table">
          <thead>
            <tr>
              <th>NT \ T</th>
              {terminals.map(t => <th key={t}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {nts.map(nt => (
              <tr key={nt}>
                <td>{nt}</td>
                {terminals.map(t => {
                  const p = table[nt]?.[t];
                  return <td key={t} className={p ? "filled" : ""}>{p ? `P${p.index}` : ""}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Errors ────────────────────────────────────────────────────────────────
function ErrorsTab({ data }) {
  const lexer  = data.lexerErrors  ?? [];
  const parser = data.parserErrors ?? [];
  const total  = lexer.length + parser.length;

  if (total === 0) {
    return (
      <div className="success-banner">
        <span style={{ fontSize: 20 }}>✅</span>
        <div>
          <strong>No errors found</strong>
          <div style={{ fontSize: 12, marginTop: 2, opacity: 0.8 }}>
            Compilation completed successfully.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="error-list">
      {lexer.map((e, i) => (
        <div key={`lex${i}`} className="error-item lexer">
          <span className="error-phase">Lexer</span>
          <div className="error-body">
            <div className="error-msg">{e.message}</div>
            <div className="error-line">Line {e.line}</div>
          </div>
        </div>
      ))}
      {parser.map((e, i) => (
        <div key={`par${i}`} className={`error-item ${e.phase ?? "syntax"}`}>
          <span className="error-phase">{e.phase ?? "syntax"}</span>
          <div className="error-body">
            <div className="error-msg">{e.message}</div>
            <div className="error-line">Line {e.line}</div>
          </div>
        </div>
      ))}
    </div>
  );
}