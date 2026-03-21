package com.compiler;

import java.util.List;

/**
 * AST.java — all Abstract Syntax Tree node types in one place.
 *
 * Hierarchy:
 *   Node (abstract)
 *     ├── StmtNode (abstract)
 *     │     ├── ProgramNode
 *     │     ├── AssignStmtNode
 *     │     ├── PrintStmtNode
 *     │     └── ForStmtNode
 *     └── ExprNode (abstract)
 *           ├── BinOpNode
 *           ├── IdentNode
 *           ├── LiteralNode
 *           └── ListLitNode
 *
 * Also contains:
 *   AssignOp  — enum: ASSIGN | PLUS_ASSIGN | MINUS_ASSIGN
 *
 * All classes are public static nested inside AST for clean namespacing.
 * Every node carries a nodeType String so Jackson can include a type
 * discriminator in JSON output.
 */
public class AST {

    // ─── AssignOp ──────────────────────────────────────────────────────────
    public enum AssignOp { ASSIGN, PLUS_ASSIGN, MINUS_ASSIGN }

    // ─── Base nodes ────────────────────────────────────────────────────────
    public abstract static class Node {
        public final String nodeType;
        protected Node(String nodeType) { this.nodeType = nodeType; }
    }

    public abstract static class StmtNode extends Node {
        protected StmtNode(String t) { super(t); }
    }

    public abstract static class ExprNode extends Node {
        protected ExprNode(String t) { super(t); }
    }

    // ─── Statement nodes ───────────────────────────────────────────────────

    public static class ProgramNode extends Node {
        public final List<StmtNode> statements;
        public ProgramNode(List<StmtNode> statements) {
            super("Program");
            this.statements = List.copyOf(statements);
        }
    }

    public static class AssignStmtNode extends StmtNode {
        public final String   ident;
        public final AssignOp op;
        public final ExprNode expr;
        public final int      line;
        public AssignStmtNode(String ident, AssignOp op, ExprNode expr, int line) {
            super("AssignStmt");
            this.ident = ident; this.op = op; this.expr = expr; this.line = line;
        }
    }

    public static class PrintStmtNode extends StmtNode {
        public final List<ExprNode> args;
        public final int            line;
        public PrintStmtNode(List<ExprNode> args, int line) {
            super("PrintStmt");
            this.args = List.copyOf(args); this.line = line;
        }
    }

    public static class ForStmtNode extends StmtNode {
        public final String         loopVar;
        public final ExprNode       iterable;
        public final List<StmtNode> body;
        public final int            line;
        public ForStmtNode(String loopVar, ExprNode iterable, List<StmtNode> body, int line) {
            super("ForStmt");
            this.loopVar = loopVar; this.iterable = iterable;
            this.body = List.copyOf(body); this.line = line;
        }
    }

    // ─── Expression nodes ──────────────────────────────────────────────────

    public static class BinOpNode extends ExprNode {
        public final String   op;
        public final ExprNode left, right;
        public final int      line;
        public BinOpNode(String op, ExprNode left, ExprNode right, int line) {
            super("BinOp");
            this.op = op; this.left = left; this.right = right; this.line = line;
        }
    }

    public static class IdentNode extends ExprNode {
        public final String name;
        public final int    line;
        public IdentNode(String name, int line) { super("Ident"); this.name = name; this.line = line; }
    }

    public static class LiteralNode extends ExprNode {
        public final String            rawValue;
        public final SymbolTable.VarType varType;
        public final int               line;
        public LiteralNode(String rawValue, SymbolTable.VarType varType, int line) {
            super("Literal");
            this.rawValue = rawValue; this.varType = varType; this.line = line;
        }
    }

    public static class ListLitNode extends ExprNode {
        public final List<ExprNode> elements;
        public final int            line;
        public ListLitNode(List<ExprNode> elements, int line) {
            super("ListLit");
            this.elements = List.copyOf(elements); this.line = line;
        }
    }

    public static class IndexNode extends ExprNode {
        public final ExprNode base;
        public final ExprNode index;
        public final int      line;

        public IndexNode(ExprNode base, ExprNode index, int line) {
            super("Index");  // ✅ FIX: pass nodeType string
            this.base = base;
            this.index = index;
            this.line = line;
        }
    }
}