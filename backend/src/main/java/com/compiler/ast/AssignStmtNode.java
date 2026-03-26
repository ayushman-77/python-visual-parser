package com.compiler.ast;

public class AssignStmtNode extends StmtNode {
    public final String   ident;
    public final AssignOp op;
    public final ExprNode expr;
    public final int      line;

    public AssignStmtNode(String ident, AssignOp op, ExprNode expr, int line) {
        super("AssignStmt");
        this.ident = ident;
        this.op    = op;
        this.expr  = expr;
        this.line  = line;
    }
}