package com.compiler;

/**
 * Unified Compiler Pipeline facade.
 * Delegates to Main.Pipeline for the complete compilation flow including
 * Lexer, Parser, AST construction, Symbol Table analysis, CFG construction,
 * First/Follow set computation, and LL(1) Parsing Table construction.
 */
public class CompilerPipeline {

    public static Main.CompilerResult compile(String source) {
        return Main.Pipeline.compile(source);
    }
}