package com.compiler.result;

import java.util.ArrayList;
import java.util.List;

import com.compiler.ast.ProgramNode;
import com.compiler.cfg.CFGGraph;
import com.compiler.lexer.LexerError;
import com.compiler.lexer.Token;
import com.compiler.Parser;
import com.compiler.parser.ParserError;
import com.compiler.symboltable.SymbolEntry;

public class CompilerResult {
    public List<Token>        tokens;
    public List<SymbolEntry>  symbolTable;
    public ProgramNode        ast;
    public CFGGraph           cfg;

    public Parser.FirstFollowResult  firstFollow;
    public Parser.ParsingTable       parsingTable;

    public List<LexerError>   lexerErrors  = new ArrayList<>();
    public List<ParserError>  parserErrors = new ArrayList<>();

    public boolean hasAnyErrors() {
        return !lexerErrors.isEmpty() || !parserErrors.isEmpty();
    }

    public boolean isComplete() { 
        return cfg != null; 
    }
}