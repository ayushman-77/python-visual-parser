package com.compiler.ast;

import java.util.List;

public class ForStmtNode extends StmtNode {
    public final String         loopVar;
    public final ExprNode       iterable;
    public final List<StmtNode> body;
    public final int            line;

    public ForStmtNode(String loopVar, ExprNode iterable, List<StmtNode> body, int line) {
        super("ForStmt");
        this.loopVar  = loopVar;
        this.iterable = iterable;
        this.body     = List.copyOf(body);
        this.line     = line;
    }
}