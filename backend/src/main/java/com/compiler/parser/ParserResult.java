package com.compiler.parser;

import java.util.List;

import com.compiler.ast.ProgramNode;
import com.compiler.symboltable.SymbolEntry;

public class ParserResult {
    public final ProgramNode       ast;
    public final List<SymbolEntry> symbolTable;
    public final List<ParserError> errors;

    public ParserResult(ProgramNode ast, List<SymbolEntry> symbolTable, List<ParserError> errors) {
        this.ast         = ast;
        this.symbolTable = symbolTable;
        this.errors      = errors;
    }

    public boolean hasErrors() { return !errors.isEmpty(); }
}