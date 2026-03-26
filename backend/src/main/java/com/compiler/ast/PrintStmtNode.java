package com.compiler.ast;

import java.util.List;

public class PrintStmtNode extends StmtNode {
    public final List<ExprNode> args;
    public final int            line;

    public PrintStmtNode(List<ExprNode> args, int line) {
        super("PrintStmt");
        this.args = List.copyOf(args);
        this.line = line;
    }
}