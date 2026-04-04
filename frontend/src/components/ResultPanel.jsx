import { useState, useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import cytoscapeDagre from "cytoscape-dagre";
cytoscape.use(cytoscapeDagre);

const TABS = [
  { id:"tokens",      label:"Tokens",       icon:"🔤" },
  { id:"symtable",    label:"Sym Table",    icon:"📋" },
  { id:"ast",         label:"AST",          icon:"🌲" },
  { id:"cfg",         label:"CFG",          icon:"⬡"  },
  { id:"firstfollow", label:"First/Follow", icon:"∑"  },
  { id:"parsetable",  label:"Parse Table",  icon:"📊" },
  { id:"errors",      label:"Errors",       icon:"⚠"  },
];

export default function ResultPanel({ result, loading, defaultTab = "tokens" }) {
  const [active, setActive] = useState(defaultTab);
  useEffect(() => { setActive(defaultTab); }, [defaultTab]);

  const errCount = result
    ? (result.lexerErrors?.length ?? 0) + (result.parserErrors?.length ?? 0)
    : 0;

  // Before any compile — show the ready state
  if (!loading && !result) {
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
        <div className="pane-head">
          <strong style={{ fontSize:12.5 }}>Output</strong>
        </div>
        <div className="ready-state">
          <div className="ready-icon">⚙</div>
          <div className="ready-title">Ready to compile</div>
          <div className="ready-sub">
            Write or upload your code in the editor, then press <strong>▶ Run</strong> to see the results here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab ${active === t.id ? "on" : ""}`} onClick={() => setActive(t.id)}>
            <span>{t.icon}</span>{t.label}
            {t.id === "errors"  && errCount > 0               && <span className="badge err">{errCount}</span>}
            {t.id === "tokens"  && result?.tokens?.length > 0 && <span className="badge">{result.tokens.length}</span>}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {loading && <div className="spinner-wrap"><div className="spinner" />Compiling…</div>}
        {!loading && result && (
          <div className="anim-in" style={{ height:"100%" }}>
            {active === "tokens"      && <TokensTab      r={result} />}
            {active === "symtable"    && <SymTab         r={result} />}
            {active === "ast"         && <ASTTab         r={result} />}
            {active === "cfg"         && <CFGTab         r={result} />}
            {active === "firstfollow" && <FFTab          r={result} />}
            {active === "parsetable"  && <ParseTab       r={result} />}
            {active === "errors"      && <ErrorsTab      r={result} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared ─────────────────────────────────────────────────────────────────
function Empty({ icon="⬜", msg }) {
  return (
    <div className="empty">
      <span className="empty-icon">{icon}</span>
      <p>{msg}</p>
    </div>
  );
}

function ttCls(type) {
  if (!type) return "tt-def";
  if (type === "IDENT") return "tt-ident";
  if (["INT_LIT","FLOAT_LIT","STRING_LIT","BOOL_LIT"].includes(type)) return "tt-lit";
  if (["FOR","IN","PRINT"].includes(type)) return "tt-kw";
  if (["PLUS","MINUS","STAR","SLASH","ASSIGN","PLUS_ASSIGN","MINUS_ASSIGN"].includes(type)) return "tt-op";
  if (["NEWLINE","INDENT","DEDENT","EOF","LPAREN","RPAREN","LBRACKET","RBRACKET","COMMA","COLON"].includes(type)) return "tt-struct";
  return "tt-def";
}

// ══════════════════════════════════════════════════════════════════════
//  TOKENS
// ══════════════════════════════════════════════════════════════════════
function TokensTab({ r }) {
  const tokens = r.tokens ?? [];
  if (!tokens.length) return <Empty icon="🔤" msg="No tokens produced." />;
  return (
    <table className="dtable">
      <thead><tr><th>#</th><th>Type</th><th>Value</th><th>Line</th></tr></thead>
      <tbody>
        {tokens.map((t, i) => (
          <tr key={i}>
            <td className="lnum">{i+1}</td>
            <td><span className={`tt ${ttCls(t.type)}`}>{t.type}</span></td>
            <td><code className="tval">{t.value === "\\n" ? "↵" : t.value || "—"}</code></td>
            <td className="lnum">{t.line}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
            <td className="lnum">{i+1}</td>
            <td><code className="sname">{s.name}</code></td>
            <td><span className={`tbadge tb-${s.type}`}>{s.type}</span></td>
            <td><span className={`scbadge sc${Math.min(s.scopeLevel,2)}`}>{s.scopeLevel===0?"global":`loop · ${s.scopeLevel}`}</span></td>
            <td className="lnum">{s.declarationLine}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  AST  —  Cytoscape Free Moving Tree
// ══════════════════════════════════════════════════════════════════════
function ASTTab({ r }) {
  const ref = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!r.ast || !ref.current) return;
    if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }

    const nodes = [];
    const edges = [];
    let idCounter = 1;

    function traverse(node, parentId = null) {
      if (!node) return;
      const id = String(idCounter++);
      
      let label = astLabel(node);
      const meta = astMeta(node);
      if (meta) label += "\n" + meta;

      nodes.push({ data: { id, label, type: node.nodeType } });

      if (parentId) {
        edges.push({ data: { id: `e${parentId}-${id}`, source: String(parentId), target: id } });
      }

      const kids = astKids(node);
      kids.forEach(kid => traverse(kid, id));
    }

    traverse(r.ast);

    cyRef.current = cytoscape({
      container: ref.current,
      elements: [...nodes, ...edges],
      style: astStyle(),
      layout: {
        name: "dagre",
        rankDir: "TB",
        nodeSep: 40,
        rankSep: 60,
        animate: false,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cyRef.current.ready(() => {
      const cy = cyRef.current;
      cy.nodes().forEach(n => n.style({ width: "label", height: "label" }));
      cy.layout({ name: "dagre", rankDir: "TB", nodeSep: 40, rankSep: 60, animate: false }).run();
      cy.fit(cy.elements(), 36);
    });

    return () => { if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; } };
  }, [r.ast]);

  if (!r.ast) return <Empty icon="🌲" msg="No AST. Check the Errors tab." />;

  return (
    <div className="ast-wrap" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="ast-legend">
        <span style={{color:"var(--dim)", fontSize:11}}>{r.ast ? "Scroll = zoom · Drag = pan" : ""}</span>
      </div>
      <div ref={ref} style={{ flex: 1, width: "100%", position:"relative" }} />
    </div>
  );
}

function astStyle() {
  return [
    {
      selector: "node",
      style: {
        "width": "label",
        "height": "label",
        "padding": "12px 14px",
        "label": "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        "text-wrap": "wrap",
        "font-family": "JetBrains Mono,Consolas,monospace",
        "font-size": "11px",
        "line-height": 1.4,
        "shape": "roundrectangle",
        "background-color": "#131220",
        "border-color": "#302e50",
        "border-width": 1.5,
        "color": "#c8c8e0",
      },
    },
    {
      selector: "node[type='Program']",
      style: { "background-color": "#0c0c22", "border-color": "#818cf8", "color": "#a5b4fc", "font-weight":"bold" }
    },
    {
      selector: "node[type='AssignStmt'], node[type='Literal']",
      style: { "background-color": "#071a0f", "border-color": "#4ade80", "color": "#86efac" }
    },
    {
      selector: "node[type='IfStmt'], node[type='ElifStmt'], node[type='ElseStmt'], node[type='WhileStmt'], node[type='ForStmt']",
      style: { "background-color": "#1a1500", "border-color": "#fbbf24", "color": "#fcd34d" }
    },
    {
      selector: "node[type='PrintStmt']",
      style: { "background-color": "#1e1b4b", "border-color": "#c084fc", "color": "#e9d5ff" }
    },
    {
      selector: "edge",
      style: {
        "width": 1.5,
        "line-color": "#302e50",
        "target-arrow-color": "#302e50",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
      },
    },
  ];
}

function astLabel(n) {
  const op = o => ({ASSIGN:"=",PLUS_ASSIGN:"+=",MINUS_ASSIGN:"-="}[o]??o);
  switch (n.nodeType) {
    case "Program":    return "Program";
    case "AssignStmt": return `${n.ident}  ${op(n.op)}`;
    case "PrintStmt":  return "print( )";
    case "ForStmt":    return `for ${n.loopVar} in`;
    case "BinOp":      return n.op;
    case "Ident":      return n.name;
    case "Literal":    return n.rawValue;
    case "ListLit":    return "[ list ]";
    case "WhileStmt":  return "while";
    case "IfStmt":     return "if";
    case "ElifStmt":   return "elif";
    case "ElseStmt":   return "else";
    case "ExprStmt":   return "Expr";
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
    case "ForStmt":    return [n.iterable, ...(n.body??[])].filter(Boolean);
    case "BinOp":      return [n.left, n.right].filter(Boolean);
    case "ListLit":    return n.elements ?? [];
    case "WhileStmt":  return [n.condition, ...(n.body??[])].filter(Boolean);
    case "IfStmt":     return [n.condition, ...(n.body??[]), ...(n.elifs??[]), n.elseStmt].filter(Boolean);
    case "ElifStmt":   return [n.condition, ...(n.body??[])].filter(Boolean);
    case "ElseStmt":   return [...(n.body??[])].filter(Boolean);
    case "ExprStmt":   return [n.expr].filter(Boolean);
    default:           return [];
  }
}

// ══════════════════════════════════════════════════════════════════════
//  CFG  —  Cytoscape with text-inside-node fix
// ══════════════════════════════════════════════════════════════════════
function CFGTab({ r }) {
  const ref  = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!r.cfg || !ref.current) return;
    if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }

    let { nodes, edges } = r.cfg;
    
    // 🔥 Remove empty merge blocks for cleaner CFG connections
    let refinedEdges = [...edges];
    const refinedNodes = [];
    
    nodes.forEach(n => {
      if (n.kind === "BLOCK" && (!n.statements || n.statements.length === 0)) {
        const inEdges = refinedEdges.filter(e => String(e.to) === String(n.id));
        const outEdges = refinedEdges.filter(e => String(e.from) === String(n.id));
        
        refinedEdges = refinedEdges.filter(e => String(e.to) !== String(n.id) && String(e.from) !== String(n.id));
        
        inEdges.forEach(ie => {
          outEdges.forEach(oe => {
            refinedEdges.push({ from: ie.from, to: oe.to, label: ie.label || oe.label });
          });
        });
      } else {
        refinedNodes.push(n);
      }
    });

    const elements = [
      ...refinedNodes.map(n => ({ data: { id: String(n.id), label: cfgLabel(n), kind: n.kind } })),
      ...refinedEdges.map((e,i) => ({ data: { id:`e${i}`, source:String(e.from), target:String(e.to), label:e.label??""} })),
    ];

    cyRef.current = cytoscape({
      container: ref.current,
      elements,
      style: cfgStyle(),
      layout: {
        name: "dagre",
        rankDir: "TB",
        nodeSep: 60,
        rankSep: 60,
        padding: 32,
        animate: false,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    // 🔥 FIX: Force resize + re-layout after render
    cyRef.current.ready(() => {
      const cy = cyRef.current;

      cy.nodes().forEach(n => {
        n.style({
          width: "label",
          height: "label"
        });
      });

      cy.layout({
        name: "dagre",
        rankDir: "TB",
        nodeSep: 60,
        rankSep: 60,
        padding: 32,
        animate: false,
      }).run();

      cy.fit(cy.elements(), 36);
    });

    return () => { if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; } };
  }, [r.cfg]);

  if (!r.cfg) return <Empty icon="⬡" msg="No CFG. Check the Errors tab." />;

  return (
    <div className="cfg-wrap">
      <div className="cfg-legend">
        <span className="cfg-ld cfg-ld-entry" />ENTRY
        <span className="cfg-ld cfg-ld-block" />BLOCK
        <span className="cfg-ld cfg-ld-for"   />FOR
        <span className="cfg-ld cfg-ld-exit"  />EXIT
        <span style={{ marginLeft:"auto", fontSize:11, color:"var(--dim)" }}>
          {r.cfg.nodes.length}N · {r.cfg.edges.length}E · scroll=zoom · drag=pan
        </span>
      </div>
      <div className="cfg-container" ref={ref} />
    </div>
  );
}

function cfgLabel(n) {
  if (n.kind === "ENTRY") return "ENTRY";
  if (n.kind === "EXIT")  return "EXIT";
  if (n.kind === "FOR_CONDITION") return (n.statements?.[0] ?? "for …").replace(/^for /, "⟳ for ");
  if (n.kind === "IF_CONDITION") return (n.statements?.[0] ?? "if …").replace(/^if /, "⬦ if ").replace(/^elif /, "⬦ elif ");
  if (n.kind === "WHILE_CONDITION") return (n.statements?.[0] ?? "while …").replace(/^while /, "⟳ while ");

  const stmts = n.statements ?? [];

  return stmts
    .map(s => s.length > 22 ? s.slice(0, 20) + "…" : s)
    .join("\n\n"); // better spacing
}

function cfgStyle() {
  return [
    {
      selector: "node",
      style: {
        "width": "label",        // ✅ FIX
        "height": "label",       // ✅ FIX
        "padding": "16px 18px",

        "label": "data(label)",
        "text-valign": "center",
        "text-halign": "center",

        "text-wrap": "wrap",
        "text-overflow-wrap": "anywhere",
        "text-max-width": "140px",

        "font-family": "JetBrains Mono,Consolas,monospace",
        "font-size": "11px",
        "line-height": 1.4,

        "shape": "roundrectangle",
        "background-color": "#131220",
        "border-color": "#302e50",
        "border-width": 1.5,
        "color": "#c8c8e0",
      },
    },
    {
      selector: "node[kind='ENTRY']",
      style: {
        "background-color": "#0c0c22",
        "border-color":     "#818cf8",
        "border-width":     2,
        "color":            "#a5b4fc",
        "font-weight":      "bold",
        "font-size":        "12px",
      },
    },
    {
      selector: "node[kind='EXIT']",
      style: {
        "background-color": "#071a0f",
        "border-color":     "#4ade80",
        "border-width":     2,
        "color":            "#86efac",
        "font-weight":      "bold",
        "font-size":        "12px",
      },
    },
    {
      selector: "node[kind='FOR_CONDITION'], node[kind='IF_CONDITION'], node[kind='WHILE_CONDITION']",
      style: {
        "shape":            "diamond",
        "background-color": "#1a1500",
        "border-color":     "#fbbf24",
        "border-width":     2,
        "color":            "#fcd34d",
        "padding":          "22px 20px",
        "text-max-width":   "140px",
      },
    },
    {
      selector: "node[kind='BLOCK']",
      style: {
        "text-halign":    "center",   // ✅ FIX
        "text-valign":    "center",
        "padding":        "14px 16px",
        "text-max-width": "140px",
      },
    },
    {
      selector: "edge",
      style: {
        "width":              1.5,
        "line-color":         "#302e50",
        "target-arrow-color": "#302e50",
        "target-arrow-shape": "triangle",
        "curve-style":        "bezier",
        "font-size":          "10px",
        "font-family":        "JetBrains Mono,monospace",
        "color":              "#64748b",
        "label":              "data(label)",
        "text-background-color":   "#070710",
        "text-background-opacity": 0.9,
        "text-background-padding": "3px",
        "text-rotation":      "autorotate",
      },
    },
    {
      selector: "edge[label='loop']",
      style: {
        "line-color":         "#fbbf24",
        "target-arrow-color": "#fbbf24",
        "line-style":         "dashed",
        "line-dash-pattern":  [6,3],
        "color":              "#fbbf24",
      },
    },
    {
      selector: "edge[label='yes']",
      style: {
        "line-color":         "#4ade80",
        "target-arrow-color": "#4ade80",
        "color":              "#4ade80",
      },
    },
    {
      selector: "edge[label='no']",
      style: {
        "line-color":         "#f87171",
        "target-arrow-color": "#f87171",
        "color":              "#f87171",
      },
    },
    {
      selector: "edge[label='exit']",
      style: {
        "line-color":         "#4ade80",
        "target-arrow-color": "#4ade80",
      },
    },
  ];
}
// ══════════════════════════════════════════════════════════════════════
//  FIRST / FOLLOW
// ══════════════════════════════════════════════════════════════════════
function FFTab({ r }) {
  if (!r.firstFollow) return <Empty icon="∑" msg="Not available." />;
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
      {Object.entries(sets ?? {}).map(([nt, toks]) => (
        <div key={nt} className="ff-row">
          <span className="ff-nt">{nt}</span>
          <span className="ff-arr">→</span>
          <div className="ff-set">
            {[...toks].map(tok => (
              <span key={tok} className={`fftok ${tok==="ε"?"eps":tok==="$"?"eof":""}`}>{tok}</span>
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
  [0, "program", ["stmt_list"]],
  [1, "stmt_list", ["stmt","stmt_list"]],
  [2, "stmt_list", ["ε"]],
  [3, "stmt", ["assign_stmt"]],
  [4, "stmt", ["print_stmt"]],
  [5, "stmt", ["for_stmt"]],
  [6, "stmt", ["while_stmt"]],
  [7, "stmt", ["if_stmt"]],
  [8, "assign_stmt", ["IDENT","assign_op","expr","NEWLINE"]],
  [9, "assign_op", ["ASSIGN"]],
  [10, "assign_op", ["PLUS_ASSIGN"]],
  [11, "assign_op", ["MINUS_ASSIGN"]],
  [12, "print_stmt", ["PRINT","LPAREN","expr_list","RPAREN","NEWLINE"]],
  [13, "for_stmt", ["FOR","IDENT","IN","expr","COLON","NEWLINE","INDENT","stmt_list","DEDENT"]],
  [14, "expr_list", ["expr","expr_list_tail"]],
  [15, "expr_list_tail", ["COMMA","expr","expr_list_tail"]],
  [16, "expr_list_tail", ["ε"]],
  [17, "expr", ["term","expr_prime"]],
  [18, "expr_prime", ["PLUS","term","expr_prime"]],
  [19, "expr_prime", ["MINUS","term","expr_prime"]],
  [20, "expr_prime", ["ε"]],
  [21, "term", ["factor","term_prime"]],
  [22, "term_prime", ["STAR","factor","term_prime"]],
  [23, "term_prime", ["SLASH","factor","term_prime"]],
  [24, "term_prime", ["ε"]],
  [25, "factor", ["LPAREN","expr","RPAREN"]],
  [26, "factor", ["IDENT","factor_tail"]],
  [27, "factor_tail", ["LBRACKET","expr","RBRACKET"]],
  [28, "factor_tail", ["ε"]],
  [29, "factor", ["literal"]],
  [30, "literal", ["INT_LIT"]],
  [31, "literal", ["FLOAT_LIT"]],
  [32, "literal", ["STRING_LIT"]],
  [33, "literal", ["BOOL_LIT"]],
  [34, "literal", ["list_lit"]],
  [35, "list_lit", ["LBRACKET","list_contents"]],
  [36, "list_contents", ["expr_list","RBRACKET"]],
  [37, "list_contents", ["RBRACKET"]],
  [38, "range_stmt", ["RANGE", "LPAREN", "expr_list", "RPAREN"]],
  [39, "factor", ["range_stmt"]],
  [40, "expr_prime", ["EQ","term","expr_prime"]],
  [41, "expr_prime", ["NEQ","term","expr_prime"]],
  [42, "expr_prime", ["LT","term","expr_prime"]],
  [43, "expr_prime", ["LE","term","expr_prime"]],
  [44, "expr_prime", ["GT","term","expr_prime"]],
  [45, "expr_prime", ["GE","term","expr_prime"]],
  [46, "condition_stmt", ["IDENT","condition_op","expr","NEWLINE"]],
  [47, "condition_op", ["EQ"]],
  [48, "condition_op", ["NEQ"]],
  [49, "condition_op", ["LT"]],
  [50, "condition_op", ["LE"]],
  [51, "condition_op", ["GT"]],
  [52, "condition_op", ["GE"]],
  [53, "while_stmt", ["WHILE", "expr", "COLON", "NEWLINE", "INDENT", "stmt_list", "DEDENT"]],
  [54, "term_prime", ["MOD","factor","term_prime"]],
  [55, "if_stmt", ["IF", "expr", "COLON", "NEWLINE", "INDENT", "stmt_list", "DEDENT", "optional_else"]],
  [56, "optional_else", ["elif_stmt"]],
  [57, "optional_else", ["else_stmt"]],
  [58, "optional_else", ["ε"]],
  [59, "elif_stmt", ["ELIF", "expr", "COLON", "NEWLINE", "INDENT", "stmt_list", "DEDENT", "optional_else"]],
  [60, "else_stmt", ["ELSE", "COLON", "NEWLINE", "INDENT", "stmt_list", "DEDENT"]]
];

const NT_SET = new Set([
  "program","stmt_list","stmt",
  "assign_stmt","assign_op", "condition_stmt", "condition_op",
  "print_stmt","for_stmt", "while_stmt", "range_stmt",
  "if_stmt", "elif_stmt", "else_stmt", "optional_else",
  "expr_list","expr_list_tail",
  "expr","expr_prime",
  "term","term_prime",
  "factor","factor_tail","literal","list_lit","list_contents"
]);

function ParseTab({ r }) {
  if (!r.parsingTable) return <Empty icon="📊" msg="Not available." />;
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
              {rhs.map((s,i) => (
                <span key={i} style={{
                  color: NT_SET.has(s) ? "var(--cyan)" : s==="ε" ? "var(--yellow)" : "var(--orange)",
                  marginRight:6, fontFamily:"var(--mono)", fontSize:12,
                }}>{s}</span>
              ))}
            </span>
          </div>
        ))}
      </div>

      <p className="sec-label" style={{ marginTop:22 }}>LL(1) Parsing Table</p>
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
                  return <td key={t} className={p?"hit":""}>{p?`P${p.index}`:""}</td>;
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
function ErrorsTab({ r }) {
  const lex    = r.lexerErrors  ?? [];
  const parser = r.parserErrors ?? [];
  if (!lex.length && !parser.length) {
    return (
      <div className="ok-banner">
        <span style={{ fontSize:20 }}>✅</span>
        <div>
          <strong>No errors found</strong>
          <div style={{ fontSize:12, marginTop:3, opacity:.75 }}>Compilation completed successfully.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="elist">
      {lex.map((e,i) => (
        <div key={`l${i}`} className="eitem lexer">
          <span className="ephase">Lexer</span>
          <div className="ebody">
            <div className="emsg">{e.message}</div>
            <div className="eline">Line {e.line}</div>
          </div>
        </div>
      ))}
      {parser.map((e,i) => (
        <div key={`p${i}`} className={`eitem ${e.phase??"syntax"}`}>
          <span className="ephase">{e.phase??"syntax"}</span>
          <div className="ebody">
            <div className="emsg">{e.message}</div>
            <div className="eline">Line {e.line}</div>
          </div>
        </div>
      ))}
    </div>
  );
}