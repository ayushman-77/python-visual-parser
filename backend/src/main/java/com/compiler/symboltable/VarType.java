package com.compiler.symboltable;

import com.compiler.lexer.TokenType;

public enum VarType {
    INT, FLOAT, STR, BOOL, LIST, UNKNOWN;

    public static VarType fromTokenType(TokenType tt) {
        return switch (tt) {
            case INT_LIT    -> INT;
            case FLOAT_LIT  -> FLOAT;
            case STRING_LIT -> STR;
            case BOOL_LIT   -> BOOL;
            default         -> UNKNOWN;
        };
    }
}