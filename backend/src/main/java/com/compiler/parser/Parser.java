package com.compiler.parser;

import java.util.ArrayList;
import java.util.List;

import com.compiler.ast.AssignOp;
import com.compiler.ast.AssignStmtNode;
import com.compiler.ast.BinOpNode;
import com.compiler.ast.ExprNode;
import com.compiler.ast.ForStmtNode;
import com.compiler.ast.IdentNode;
import com.compiler.ast.ListLitNode;
import com.compiler.ast.LiteralNode;
import com.compiler.ast.PrintStmtNode;
import com.compiler.ast.ProgramNode;
import com.compiler.ast.StmtNode;
import com.compiler.lexer.Token;
import com.compiler.lexer.TokenType;
import com.compiler.symboltable.SymbolEntry;
import com.compiler.symboltable.SymbolTable;
import com.compiler.symboltable.VarType;

public class Parser {

    private final List<Token>       tokens;
    private       int               pos = 0;
    private final SymbolTable       symbolTable = new SymbolTable();
    private final List<ParserError> errors      = new ArrayList<>();

    public Parser(List<Token> tokens) {
        this.tokens = tokens.stream()
            .filter(t -> t.type != TokenType.UNKNOWN)
            .toList();
    }

    public ParserResult parse() {
        ProgramNode root = parseProgram();
        return new ParserResult(root, symbolTable.snapshot(), errors);
    }

    private Token peek()           { return tokens.get(Math.min(pos, tokens.size() - 1)); }
    private Token consume()        { Token t = peek(); if (pos < tokens.size() - 1) pos++; return t; }
    private boolean atTokenType(TokenType t) { return peek().type == t; }

    private Token expect(TokenType expected) {
        Token t = peek();
        if (t.type == expected) return consume();
        errors.add(new ParserError(
            "Expected " + expected + " but got " + t.type + " (\"" + t.value + "\")",
            t.line, "syntax"));
        return t;
    }

    private void skipToNextLine() {
        while (peek().type != TokenType.NEWLINE && peek().type != TokenType.EOF) consume();
        if (peek().type == TokenType.NEWLINE) consume();
    }

    private boolean isExprStart() {
        return switch (peek().type) {
            case LPAREN, IDENT, INT_LIT, FLOAT_LIT, STRING_LIT, BOOL_LIT, LBRACKET -> true;
            default -> false;
        };
    }

    private ProgramNode parseProgram() {
        List<StmtNode> stmts = parseStmtList();
        expect(TokenType.EOF);
        return new ProgramNode(stmts);
    }

    private List<StmtNode> parseStmtList() {
        List<StmtNode> stmts = new ArrayList<>();
        while (isStmtStart()) {
            StmtNode s = parseStmt();
            if (s != null) stmts.add(s);
        }
        return stmts;
    }

    private boolean isStmtStart() {
        return switch (peek().type) {
            case IDENT, PRINT, FOR -> true;
            default -> false;
        };
    }

    private StmtNode parseStmt() {
        return switch (peek().type) {
            case IDENT -> parseAssignStmt();
            case PRINT -> parsePrintStmt();
            case FOR   -> parseForStmt();
            default -> {
                errors.add(new ParserError(
                    "Unexpected token " + peek().type + " at start of statement",
                    peek().line, "syntax"));
                skipToNextLine();
                yield null;
            }
        };
    }

    private AssignStmtNode parseAssignStmt() {
        Token identToken = expect(TokenType.IDENT);
        String name = identToken.value;

        AssignOp op;
        switch (peek().type) {
            case ASSIGN       -> { consume(); op = AssignOp.ASSIGN;       }
            case PLUS_ASSIGN  -> { consume(); op = AssignOp.PLUS_ASSIGN;  }
            case MINUS_ASSIGN -> { consume(); op = AssignOp.MINUS_ASSIGN; }
            default -> {
                errors.add(new ParserError(
                    "Expected assignment operator after '" + name + "'",
                    peek().line, "syntax"));
                skipToNextLine();
                return null;
            }
        }

        ExprNode expr = parseExpr();
        expect(TokenType.NEWLINE);

        VarType inferred = inferType(expr);
        if (op != AssignOp.ASSIGN && !symbolTable.isDeclared(name))
            errors.add(new ParserError(
                "Variable '" + name + "' used before assignment", identToken.line, "semantic"));

        symbolTable.declare(name, inferred, identToken.line);
        return new AssignStmtNode(name, op, expr, identToken.line);
    }

    private PrintStmtNode parsePrintStmt() {
        Token printToken = expect(TokenType.PRINT);
        expect(TokenType.LPAREN);
        List<ExprNode> args = parseExprList();
        expect(TokenType.RPAREN);
        expect(TokenType.NEWLINE);
        return new PrintStmtNode(args, printToken.line);
    }

    private ForStmtNode parseForStmt() {
        Token forToken     = expect(TokenType.FOR);
        Token loopVarToken = expect(TokenType.IDENT);
        expect(TokenType.IN);
        ExprNode iterable = parseExpr();
        expect(TokenType.COLON);
        expect(TokenType.NEWLINE);
        expect(TokenType.INDENT);

        symbolTable.enterScope();
        symbolTable.declare(loopVarToken.value, VarType.UNKNOWN, loopVarToken.line);
        List<StmtNode> body = parseStmtList();
        expect(TokenType.DEDENT);
        symbolTable.exitScope();

        return new ForStmtNode(loopVarToken.value, iterable, body, forToken.line);
    }

    private List<ExprNode> parseExprList() {
        List<ExprNode> list = new ArrayList<>();
        list.add(parseExpr());
        while (atTokenType(TokenType.COMMA)) { consume(); list.add(parseExpr()); }
        return list;
    }

    private ExprNode parseExpr() {
        ExprNode left = parseTerm();
        while (peek().type == TokenType.PLUS || peek().type == TokenType.MINUS) {
            Token op = consume();
            left = new BinOpNode(op.value, left, parseTerm(), op.line);
        }
        return left;
    }

    private ExprNode parseTerm() {
        ExprNode left = parseFactor();
        while (peek().type == TokenType.STAR || peek().type == TokenType.SLASH) {
            Token op = consume();
            left = new BinOpNode(op.value, left, parseFactor(), op.line);
        }
        return left;
    }

    private ExprNode parseFactor() {
        Token t = peek();
        return switch (t.type) {
            case LPAREN -> {
                consume();
                ExprNode e = parseExpr();
                expect(TokenType.RPAREN);
                yield e;
            }
            case IDENT -> {
                consume();
                if (!symbolTable.isDeclared(t.value))
                    errors.add(new ParserError(
                        "Undeclared variable '" + t.value + "'", t.line, "semantic"));
                yield new IdentNode(t.value, t.line);
            }
            case INT_LIT, FLOAT_LIT, STRING_LIT, BOOL_LIT, LBRACKET -> parseLiteral();
            default -> {
                errors.add(new ParserError(
                    "Unexpected token in expression: " + t.type, t.line, "syntax"));
                consume();
                yield new LiteralNode("?", VarType.UNKNOWN, t.line);
            }
        };
    }

    private ExprNode parseLiteral() {
        Token t = peek();
        return switch (t.type) {
            case INT_LIT, FLOAT_LIT, STRING_LIT, BOOL_LIT -> {
                consume();
                yield new LiteralNode(t.value, VarType.fromTokenType(t.type), t.line);
            }
            case LBRACKET -> parseListLit();
            default -> {
                errors.add(new ParserError("Expected literal", t.line, "syntax"));
                yield new LiteralNode("?", VarType.UNKNOWN, t.line);
            }
        };
    }

    private ListLitNode parseListLit() {
        Token bracket = expect(TokenType.LBRACKET);
        List<ExprNode> elements = new ArrayList<>();
        if (!atTokenType(TokenType.RBRACKET)) elements = parseExprList();
        expect(TokenType.RBRACKET);
        return new ListLitNode(elements, bracket.line);
    }

    private VarType inferType(ExprNode expr) {
        if (expr instanceof LiteralNode lit) return lit.varType;
        if (expr instanceof ListLitNode)    return VarType.LIST;
        if (expr instanceof IdentNode id) {
            SymbolEntry e = symbolTable.lookup(id.name);
            return e != null ? e.type : VarType.UNKNOWN;
        }
        if (expr instanceof BinOpNode bin) {
            VarType l = inferType(bin.left), r = inferType(bin.right);
            if (l == VarType.FLOAT || r == VarType.FLOAT) return VarType.FLOAT;
            if (l == VarType.INT   && r == VarType.INT)   return VarType.INT;
            if (l == VarType.STR   && r == VarType.STR && bin.op.equals("+")) return VarType.STR;
            return VarType.UNKNOWN;
        }
        return VarType.UNKNOWN;
    }
}