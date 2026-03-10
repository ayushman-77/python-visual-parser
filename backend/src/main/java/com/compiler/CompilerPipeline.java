package com.compiler;

import com.compiler.cfg.CFGBuilder;
import com.compiler.lexer.Lexer;
import com.compiler.lexer.LexerResult;
import com.compiler.parser.*;
import com.compiler.result.CompilerResult;

public class CompilerPipeline {

    private static final FirstFollowResult FIRST_FOLLOW;
    private static final ParsingTable      PARSING_TABLE;

    static {
        FIRST_FOLLOW  = FirstFollowComputer.compute();
        PARSING_TABLE = new ParsingTable(FIRST_FOLLOW);
    }

    public static CompilerResult compile(String source) {
        CompilerResult result = new CompilerResult();

        // Phase 1: Lexer
        LexerResult lexerResult = new Lexer(source).tokenize();
        result.tokens      = lexerResult.tokens;
        result.lexerErrors = lexerResult.errors;

        // Grammar-level data (always available)
        result.firstFollow  = FIRST_FOLLOW;
        result.parsingTable = PARSING_TABLE;

        // Phase 2: Parser
        ParserResult parserResult = new Parser(lexerResult.tokens).parse();
        result.ast          = parserResult.ast;
        result.symbolTable  = parserResult.symbolTable;
        result.parserErrors = parserResult.errors;

        // Phase 3: CFG
        if (parserResult.ast != null) {
            result.cfg = CFGBuilder.build(parserResult.ast);
        }

        return result;
    }
}