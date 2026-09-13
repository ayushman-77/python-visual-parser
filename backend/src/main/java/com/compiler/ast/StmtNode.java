package com.compiler.ast;

public abstract class StmtNode extends ASTNode {
    protected StmtNode(String nodeType) {
        super(nodeType);
    }
}