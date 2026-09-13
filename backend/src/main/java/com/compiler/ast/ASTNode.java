package com.compiler.ast;

public abstract class ASTNode {
    public final String nodeType;

    protected ASTNode(String nodeType) {
        this.nodeType = nodeType;
    }
}