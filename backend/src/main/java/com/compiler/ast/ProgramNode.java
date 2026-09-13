package com.compiler.ast;

import java.util.List;

public class ProgramNode extends ASTNode {
    public final List<StmtNode> statements;

    public ProgramNode(List<StmtNode> statements) {
        super("Program");
        this.statements = List.copyOf(statements);
    }
}