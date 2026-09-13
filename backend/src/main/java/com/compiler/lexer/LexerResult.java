package com.compiler.lexer;

import java.util.List;

public class LexerResult {
    public final List<Token>      tokens;
    public final List<LexerError> errors;

    public LexerResult(List<Token> tokens, List<LexerError> errors) {
        this.tokens = tokens;
        this.errors = errors;
    }

    public boolean hasErrors() {
        return !errors.isEmpty();
    }
}