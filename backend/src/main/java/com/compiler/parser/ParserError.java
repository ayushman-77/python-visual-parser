package com.compiler.parser;

public class ParserError {
    public final String message;
    public final int    line;
    public final String phase;   // "syntax" | "semantic"

    public ParserError(String message, int line, String phase) {
        this.message = message;
        this.line    = line;
        this.phase   = phase;
    }
}