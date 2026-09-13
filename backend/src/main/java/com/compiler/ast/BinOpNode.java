package com.compiler.ast;

public class BinOpNode extends ExprNode {
    public final String   op;
    public final ExprNode left;
    public final ExprNode right;
    public final int      line;

    public BinOpNode(String op, ExprNode left, ExprNode right, int line) {
        super("BinOp");
        this.op    = op;
        this.left  = left;
        this.right = right;
        this.line  = line;
    }
}