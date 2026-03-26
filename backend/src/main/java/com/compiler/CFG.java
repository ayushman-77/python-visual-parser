package com.compiler;

import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

// import com.compiler.AST.*;
import com.compiler.AST.AssignStmtNode;
import com.compiler.AST.BinOpNode;
import com.compiler.AST.ExprNode;
import com.compiler.AST.ForStmtNode;
import com.compiler.AST.IdentNode;
import com.compiler.AST.ListLitNode;
import com.compiler.AST.LiteralNode;
import com.compiler.AST.PrintStmtNode;
import com.compiler.AST.ProgramNode;
import com.compiler.AST.StmtNode;

/**
 * CFG.java — everything related to the Control Flow Graph.
 *
 * Contains:
 *   CFGNode   — one basic block (ENTRY | EXIT | BLOCK | FOR_CONDITION)
 *   CFGEdge   — directed edge between two nodes with optional label
 *   CFGGraph  — the complete graph: List<CFGNode> + List<CFGEdge>
 *   Builder   — builds a CFGGraph from a ProgramNode AST
 *
 * Input  : ProgramNode  (root of AST)
 * Output : CFGGraph
 */
public class CFG {

    // ─── CFGNode ───────────────────────────────────────────────────────────
    public enum NodeKind { ENTRY, EXIT, BLOCK, FOR_CONDITION }

    public static class CFGNode {
        public final int          id;
        public final NodeKind     kind;
        public final List<String> statements;
        public final int          startLine;

        public CFGNode(int id, NodeKind kind, List<String> statements, int startLine) {
            this.id = id; this.kind = kind;
            this.statements = List.copyOf(statements); this.startLine = startLine;
        }

        static CFGNode sentinel(int id, NodeKind kind) {
            return new CFGNode(id, kind, List.of(), 0);
        }
    }

    // ─── CFGEdge ───────────────────────────────────────────────────────────
    public static class CFGEdge {
        public final int    from, to;
        public final String label;
        public CFGEdge(int from, int to, String label) { this.from = from; this.to = to; this.label = label; }
        public CFGEdge(int from, int to)               { this(from, to, ""); }
    }

    // ─── CFGGraph ──────────────────────────────────────────────────────────
    public static class CFGGraph {
        public final List<CFGNode> nodes;
        public final List<CFGEdge> edges;
        public CFGGraph(List<CFGNode> nodes, List<CFGEdge> edges) {
            this.nodes = List.copyOf(nodes); this.edges = List.copyOf(edges);
        }
    }

    // ─── Builder ───────────────────────────────────────────────────────────
    public static class Builder {
        private final List<CFGNode> nodes = new ArrayList<>();
        private final List<CFGEdge> edges = new ArrayList<>();
        private int id = 0;

        /** Single static entry point. */
        public static CFGGraph build(ProgramNode program) {
            return new Builder().run(program);
        }

        private CFGGraph run(ProgramNode program) {
            CFGNode entry = add(CFGNode.sentinel(next(), NodeKind.ENTRY));
            CFGNode exit  = CFGNode.sentinel(next(), NodeKind.EXIT);
            int     last  = buildList(program.statements, entry.id);
            nodes.add(exit);
            edges.add(new CFGEdge(last, exit.id));
            return new CFGGraph(List.copyOf(nodes), List.copyOf(edges));
        }

        private int buildList(List<StmtNode> stmts, int prev) {
            List<String> block = new ArrayList<>();
            int          bLine = 0;

            for (StmtNode stmt : stmts) {
                if (stmt instanceof ForStmtNode f) {
                    if (!block.isEmpty()) {
                        CFGNode n = add(new CFGNode(next(), NodeKind.BLOCK, block, bLine));
                        edges.add(new CFGEdge(prev, n.id));
                        prev = n.id;
                        block = new ArrayList<>();
                    }
                    prev = buildFor(f, prev);
                } else {
                    if (block.isEmpty()) bLine = lineOf(stmt);
                    block.add(str(stmt));
                }
            }

            if (!block.isEmpty()) {
                CFGNode n = add(new CFGNode(next(), NodeKind.BLOCK, block, bLine));
                edges.add(new CFGEdge(prev, n.id));
                prev = n.id;
            }
            return prev;
        }

        private int buildFor(ForStmtNode f, int prev) {
            CFGNode cond = add(new CFGNode(next(), NodeKind.FOR_CONDITION,
                List.of("for " + f.loopVar + " in " + exprStr(f.iterable)), f.line));
            edges.add(new CFGEdge(prev, cond.id));
            int bodyEnd = buildList(f.body, cond.id);
            edges.add(new CFGEdge(bodyEnd, cond.id, "loop"));
            return cond.id;
        }

        private CFGNode add(CFGNode n) { nodes.add(n); return n; }
        private int     next()         { return id++; }

        private int lineOf(StmtNode s) {
            if (s instanceof AssignStmtNode a) return a.line;
            if (s instanceof PrintStmtNode  p) return p.line;
            if (s instanceof ForStmtNode    f) return f.line;
            return 0;
        }

        private String str(StmtNode s) {
            if (s instanceof AssignStmtNode a)
                return a.ident + " " + opStr(a.op) + " " + exprStr(a.expr);
            if (s instanceof PrintStmtNode p) {
                StringJoiner sj = new StringJoiner(", ");
                p.args.forEach(e -> sj.add(exprStr(e)));
                return "print(" + sj + ")";
            }
            return s.nodeType;
        }

        private String opStr(AST.AssignOp op) {
            return switch (op) { case ASSIGN -> "="; case PLUS_ASSIGN -> "+="; case MINUS_ASSIGN -> "-="; };
        }

        private String exprStr(ExprNode e) {
            if (e instanceof LiteralNode  l) return l.rawValue;
            if (e instanceof IdentNode    i) return i.name;
            if (e instanceof BinOpNode    b) return exprStr(b.left) + " " + b.op + " " + exprStr(b.right);
            if (e instanceof ListLitNode  l) {
                StringJoiner sj = new StringJoiner(", ");
                l.elements.forEach(el -> sj.add(exprStr(el)));
                return "[" + sj + "]";
            }
            return "?";
        }
    }
}