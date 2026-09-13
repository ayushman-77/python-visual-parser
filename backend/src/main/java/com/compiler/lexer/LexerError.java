package com.compiler.lexer;

public class LexerError {
    public final String message;
    public final int    line;

    public LexerError(String message, int line) {
        this.message = message;
        this.line    = line;
    }
}