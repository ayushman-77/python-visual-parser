package com.compiler;

import com.compiler.lexer.Lexer;
import com.compiler.lexer.LexerResult;
import com.compiler.parser.Parser;
import com.compiler.parser.ParserResult;
import com.compiler.result.CompilerResult;
import com.compiler.cfg.CFGBuilder;

public class CompilerPipeline {

    public static CompilerResult compile(String source) {
        CompilerResult result = new CompilerResult();

        // Phase 1: Lexer
        LexerResult lexerResult = new Lexer(source).tokenize();
        result.tokens = lexerResult.tokens;
        result.lexerErrors = lexerResult.errors;

        // Phase 2: Parser
        ParserResult parserResult = new Parser(lexerResult.tokens).parse();

        result.ast = parserResult.ast;
        result.symbolTable = parserResult.symbolTable;
        result.parserErrors = parserResult.errors;

        // Phase 3: CFG
        if (parserResult.ast != null) {
            result.cfg = CFGBuilder.build(parserResult.ast);
        }

        return result;
    }
}