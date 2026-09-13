package com.compiler;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Lexer {

    public enum TokenType {
        INT_LIT, FLOAT_LIT, STRING_LIT, BOOL_LIT,
        IDENT,
        WHILE, FOR, IN, RANGE, PRINT,
        DEF, RETURN, IMPORT, FROM, AS,
        PLUS, MINUS, STAR, SLASH, MOD,
        EQ, NEQ, LT, LE, GT, GE,
        IF, ELIF, ELSE,
        ASSIGN, PLUS_ASSIGN, MINUS_ASSIGN,
        LPAREN, RPAREN, LBRACKET, RBRACKET,
        COMMA, COLON, DOT,
        NEWLINE, INDENT, DEDENT,
        EOF, UNKNOWN
    }

    public static class Token {
        public final TokenType type;
        public final String    value;
        public final int       line;

        public Token(TokenType type, String value, int line) {
            this.type = type; 
            this.value = value; 
            this.line = line;
        }

        @Override 
        public String toString() {
            return String.format("Token(%-16s \"%s\"  line %d)", type, value, line);
        }
    }

    public static class LexerError {
        public final String message;
        public final int    line;
        public LexerError(String message, int line) { 
            this.message = message; 
            this.line = line; 
        }
    }

    public static class Result {
        public final List<Token>      tokens;
        public final List<LexerError> errors;
        public Result(List<Token> tokens, List<LexerError> errors) {
            this.tokens = tokens; 
            this.errors = errors;
        }
        public boolean hasErrors() { 
            return !errors.isEmpty(); 
        }
    }

    private record TokenRule(TokenType type, Pattern pattern) {}

    private static final List<TokenRule> RULES = List.of(
        new TokenRule(TokenType.FLOAT_LIT,    Pattern.compile("\\d+\\.\\d+")),
        new TokenRule(TokenType.INT_LIT,      Pattern.compile("\\d+")),
        new TokenRule(TokenType.STRING_LIT,   Pattern.compile("\"[^\"]*\"|'[^']*'")),
        new TokenRule(TokenType.PLUS_ASSIGN,  Pattern.compile("\\+\\s*=")),
        new TokenRule(TokenType.MINUS_ASSIGN, Pattern.compile("-\\s*=")),
        new TokenRule(TokenType.EQ,           Pattern.compile("=\\s*=")),
        new TokenRule(TokenType.NEQ,          Pattern.compile("!\\s*=")),
        new TokenRule(TokenType.LE,           Pattern.compile("<\\s*=")),
        new TokenRule(TokenType.GE,           Pattern.compile(">\\s*=")),
        new TokenRule(TokenType.ASSIGN,       Pattern.compile("=")),
        new TokenRule(TokenType.PLUS,         Pattern.compile("\\+")),
        new TokenRule(TokenType.MINUS,        Pattern.compile("-")),
        new TokenRule(TokenType.STAR,         Pattern.compile("\\*")),
        new TokenRule(TokenType.SLASH,        Pattern.compile("/")),
        new TokenRule(TokenType.MOD,          Pattern.compile("%")),
        new TokenRule(TokenType.LT,           Pattern.compile("<")),
        new TokenRule(TokenType.GT,           Pattern.compile(">")),
        new TokenRule(TokenType.LPAREN,       Pattern.compile("\\(")),
        new TokenRule(TokenType.RPAREN,       Pattern.compile("\\)")),
        new TokenRule(TokenType.LBRACKET,     Pattern.compile("\\[")),
        new TokenRule(TokenType.RBRACKET,     Pattern.compile("\\]")),
        new TokenRule(TokenType.COMMA,        Pattern.compile(",")),
        new TokenRule(TokenType.COLON,        Pattern.compile(":")),
        new TokenRule(TokenType.DOT,          Pattern.compile("\\.")),
        new TokenRule(TokenType.IDENT,        Pattern.compile("[a-zA-Z_][a-zA-Z0-9_]*"))
    );

    private static final Map<String, TokenType> KEYWORDS = Map.ofEntries(
        Map.entry("while", TokenType.WHILE),
        Map.entry("for",   TokenType.FOR),
        Map.entry("in",    TokenType.IN),
        Map.entry("range", TokenType.RANGE),
        Map.entry("print", TokenType.PRINT),
        Map.entry("True",  TokenType.BOOL_LIT),
        Map.entry("False", TokenType.BOOL_LIT),
        Map.entry("if",    TokenType.IF),
        Map.entry("elif",  TokenType.ELIF),
        Map.entry("else",  TokenType.ELSE),
        Map.entry("def",   TokenType.DEF),
        Map.entry("return",TokenType.RETURN),
        Map.entry("import",TokenType.IMPORT),
        Map.entry("from",  TokenType.FROM),
        Map.entry("as",    TokenType.AS)
    );

    private final String           source;
    private final List<Token>      tokens = new ArrayList<>();
    private final List<LexerError> errors = new ArrayList<>();

    public Lexer(String source) { 
        this.source = source; 
    }

    public Result tokenize() {
        String[] lines = source.split("\n", -1);
        Deque<Integer> indentStack = new ArrayDeque<>();
        indentStack.push(0);

        for (int i = 0; i < lines.length; i++) {
            int    ln      = i + 1;
            String raw     = lines[i];
            String trimmed = raw.stripLeading();

            if (trimmed.isEmpty() || trimmed.startsWith("#")) 
                continue;

            int indent  = raw.length() - trimmed.length();
            int current = indentStack.peek();

            if (indent > current) {
                indentStack.push(indent);
                tokens.add(new Token(TokenType.INDENT, "", ln));
            } else if (indent < current) {
                while (indentStack.peek() > indent) {
                    indentStack.pop();
                    tokens.add(new Token(TokenType.DEDENT, "", ln));
                }
                if (indentStack.peek() != indent)
                    errors.add(new LexerError("Indentation mismatch at level " + indent, ln));
            }
            
            int hash = trimmed.indexOf('#');
            String content = hash >= 0 ? trimmed.substring(0, hash).stripTrailing() : trimmed;

            scanLine(content, ln);
            tokens.add(new Token(TokenType.NEWLINE, "\\n", ln));
        }

        int last = lines.length;
        while (indentStack.peek() > 0) { 
            indentStack.pop(); 
            tokens.add(new Token(TokenType.DEDENT, "", last)); 
        }
        tokens.add(new Token(TokenType.EOF, "$", last));

        return new Result(List.copyOf(tokens), List.copyOf(errors));
    }

    private void scanLine(String line, int ln) {
        int pos = 0;
        while (pos < line.length()) {
            if (Character.isWhitespace(line.charAt(pos))) { 
                pos++; 
                continue; 
            }
            String rem = line.substring(pos);
            boolean matched = false;
            for (TokenRule rule : RULES) {
                Matcher m = rule.pattern().matcher(rem);
                if (m.lookingAt()) {
                    String rawVal = m.group();
                    TokenType type = rule.type();
                    if (type == TokenType.IDENT && KEYWORDS.containsKey(rawVal)) 
                        type = KEYWORDS.get(rawVal);

                    String val = rawVal;
                    if (type == TokenType.NEQ) val = "!=";
                    else if (type == TokenType.EQ) val = "==";
                    else if (type == TokenType.LE) val = "<=";
                    else if (type == TokenType.GE) val = ">=";
                    else if (type == TokenType.PLUS_ASSIGN) val = "+=";
                    else if (type == TokenType.MINUS_ASSIGN) val = "-=";

                    tokens.add(new Token(type, val, ln));
                    pos += rawVal.length();
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                errors.add(new LexerError("Unexpected character: '" + line.charAt(pos) + "'", ln));
                tokens.add(new Token(TokenType.UNKNOWN, String.valueOf(line.charAt(pos)), ln));
                pos++;
            }
        }
    }
}