package com.compiler.parser;

import java.util.List;

public class Grammar {

    public static final String EPSILON = "ε";
    public static final String EOF     = "$";

    public static final List<String> NON_TERMINALS = List.of(
        "program", "stmt_list", "stmt",
        "assign_stmt", "assign_op",
        "print_stmt",
        "for_stmt",
        "expr_list", "expr_list_tail",
        "expr", "expr_prime",
        "term", "term_prime",
        "factor", "literal", "list_lit"
    );

    public static final String START = "program";

    public static final List<Production> ALL = List.of(
        new Production(0,  "program",        List.of("stmt_list")),
        new Production(1,  "stmt_list",      List.of("stmt", "stmt_list")),
        new Production(2,  "stmt_list",      List.of(EPSILON)),
        new Production(3,  "stmt",           List.of("assign_stmt")),
        new Production(4,  "stmt",           List.of("print_stmt")),
        new Production(5,  "stmt",           List.of("for_stmt")),
        new Production(6,  "assign_stmt",    List.of("IDENT", "assign_op", "expr", "NEWLINE")),
        new Production(7,  "assign_op",      List.of("ASSIGN")),
        new Production(8,  "assign_op",      List.of("PLUS_ASSIGN")),
        new Production(9,  "assign_op",      List.of("MINUS_ASSIGN")),
        new Production(10, "print_stmt",     List.of("PRINT", "LPAREN", "expr_list", "RPAREN", "NEWLINE")),
        new Production(11, "for_stmt",       List.of("FOR", "IDENT", "IN", "expr", "COLON", "NEWLINE", "INDENT", "stmt_list", "DEDENT")),
        new Production(12, "expr_list",      List.of("expr", "expr_list_tail")),
        new Production(13, "expr_list_tail", List.of("COMMA", "expr", "expr_list_tail")),
        new Production(14, "expr_list_tail", List.of(EPSILON)),
        new Production(15, "expr",           List.of("term", "expr_prime")),
        new Production(16, "expr_prime",     List.of("PLUS",  "term", "expr_prime")),
        new Production(17, "expr_prime",     List.of("MINUS", "term", "expr_prime")),
        new Production(18, "expr_prime",     List.of(EPSILON)),
        new Production(19, "term",           List.of("factor", "term_prime")),
        new Production(20, "term_prime",     List.of("STAR",  "factor", "term_prime")),
        new Production(21, "term_prime",     List.of("SLASH", "factor", "term_prime")),
        new Production(22, "term_prime",     List.of(EPSILON)),
        new Production(23, "factor",         List.of("LPAREN", "expr", "RPAREN")),
        new Production(24, "factor",         List.of("IDENT")),
        new Production(25, "factor",         List.of("literal")),
        new Production(26, "literal",        List.of("INT_LIT")),
        new Production(27, "literal",        List.of("FLOAT_LIT")),
        new Production(28, "literal",        List.of("STRING_LIT")),
        new Production(29, "literal",        List.of("BOOL_LIT")),
        new Production(30, "literal",        List.of("list_lit")),
        new Production(31, "list_lit",       List.of("LBRACKET", "expr_list", "RBRACKET")),
        new Production(32, "list_lit",       List.of("LBRACKET", "RBRACKET"))
    );

    public static List<Production> productionsFor(String nonTerminal) {
        return ALL.stream().filter(p -> p.lhs.equals(nonTerminal)).toList();
    }

    public static boolean isNonTerminal(String symbol) {
        return NON_TERMINALS.contains(symbol);
    }

    public static boolean isTerminal(String symbol) {
        return !isNonTerminal(symbol);
    }
}