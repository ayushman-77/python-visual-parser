package com.compiler.lexer;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Lexer {

    private record TokenPattern(TokenType type, Pattern pattern) {}

    private static final List<TokenPattern> PATTERNS = List.of(
        new TokenPattern(TokenType.FLOAT_LIT,    Pattern.compile("\\d+\\.\\d+")),
        new TokenPattern(TokenType.INT_LIT,      Pattern.compile("\\d+")),
        new TokenPattern(TokenType.STRING_LIT,   Pattern.compile("\"[^\"]*\"|'[^']*'")),
        new TokenPattern(TokenType.PLUS_ASSIGN,  Pattern.compile("\\+=")),
        new TokenPattern(TokenType.MINUS_ASSIGN, Pattern.compile("-=")),
        new TokenPattern(TokenType.ASSIGN,       Pattern.compile("=")),
        new TokenPattern(TokenType.PLUS,         Pattern.compile("\\+")),
        new TokenPattern(TokenType.MINUS,        Pattern.compile("-")),
        new TokenPattern(TokenType.STAR,         Pattern.compile("\\*")),
        new TokenPattern(TokenType.SLASH,        Pattern.compile("/")),
        new TokenPattern(TokenType.LPAREN,       Pattern.compile("\\(")),
        new TokenPattern(TokenType.RPAREN,       Pattern.compile("\\)")),
        new TokenPattern(TokenType.LBRACKET,     Pattern.compile("\\[")),
        new TokenPattern(TokenType.RBRACKET,     Pattern.compile("\\]")),
        new TokenPattern(TokenType.COMMA,        Pattern.compile(",")),
        new TokenPattern(TokenType.COLON,        Pattern.compile(":")),
        new TokenPattern(TokenType.IDENT,        Pattern.compile("[a-zA-Z_][a-zA-Z0-9_]*"))
    );

    private static final Map<String, TokenType> KEYWORDS = Map.of(
        "for",   TokenType.FOR,
        "in",    TokenType.IN,
        "print", TokenType.PRINT,
        "True",  TokenType.BOOL_LIT,
        "False", TokenType.BOOL_LIT
    );

    private final String           source;
    private final List<Token>      tokens = new ArrayList<>();
    private final List<LexerError> errors = new ArrayList<>();

    public Lexer(String source) {
        this.source = source;
    }

    public LexerResult tokenize() {
        String[] lines = source.split("\n", -1);
        Deque<Integer> indentStack = new ArrayDeque<>();
        indentStack.push(0);

        for (int i = 0; i < lines.length; i++) {
            int    lineNumber = i + 1;
            String rawLine    = lines[i];
            String stripped   = rawLine.stripLeading();

            if (stripped.isEmpty() || stripped.startsWith("#")) continue;

            int indent        = rawLine.length() - stripped.length();
            int currentIndent = indentStack.peek();

            if (indent > currentIndent) {
                indentStack.push(indent);
                tokens.add(new Token(TokenType.INDENT, "", lineNumber));
            } else if (indent < currentIndent) {
                while (indentStack.peek() > indent) {
                    indentStack.pop();
                    tokens.add(new Token(TokenType.DEDENT, "", lineNumber));
                }
                if (indentStack.peek() != indent) {
                    errors.add(new LexerError(
                        "Indentation error: level " + indent + " does not match any outer level",
                        lineNumber));
                }
            }

            // Strip inline comment
            String content = stripped;
            int hashIdx = content.indexOf('#');
            if (hashIdx >= 0) content = content.substring(0, hashIdx).stripTrailing();

            tokenizeLine(content, lineNumber);
            tokens.add(new Token(TokenType.NEWLINE, "\\n", lineNumber));
        }

        int lastLine = lines.length;
        while (indentStack.peek() > 0) {
            indentStack.pop();
            tokens.add(new Token(TokenType.DEDENT, "", lastLine));
        }

        tokens.add(new Token(TokenType.EOF, "$", lastLine));
        return new LexerResult(List.copyOf(tokens), List.copyOf(errors));
    }

    private void tokenizeLine(String line, int lineNumber) {
        int pos = 0;
        while (pos < line.length()) {
            if (Character.isWhitespace(line.charAt(pos))) { pos++; continue; }

            String  remaining = line.substring(pos);
            boolean matched   = false;

            for (TokenPattern tp : PATTERNS) {
                Matcher m = tp.pattern().matcher(remaining);
                if (m.lookingAt()) {
                    String    value = m.group();
                    TokenType type  = tp.type();
                    if (type == TokenType.IDENT && KEYWORDS.containsKey(value))
                        type = KEYWORDS.get(value);
                    tokens.add(new Token(type, value, lineNumber));
                    pos += value.length();
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                errors.add(new LexerError(
                    "Unexpected character: '" + line.charAt(pos) + "'", lineNumber));
                tokens.add(new Token(TokenType.UNKNOWN, String.valueOf(line.charAt(pos)), lineNumber));
                pos++;
            }
        }
    }
}