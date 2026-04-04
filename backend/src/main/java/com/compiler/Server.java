package com.compiler;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@SpringBootApplication
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class Server {

    public static void main(String[] args) {
        System.setProperty("server.port", "7070");
        SpringApplication.run(Server.class, args);
    }

    @PostMapping("/compile")
    public ResponseEntity<?> compile(@RequestBody CompileRequest req) {
        if (req.code == null || req.code.isBlank()) {
            return ResponseEntity.badRequest().body(new ErrorResponse("Request body must contain a non-empty 'code' field."));
        }
        Main.CompilerResult result = Main.Pipeline.compile(req.code);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(new HealthResponse("ok", 7070));
    }

    public static class CompileRequest {
        public String code;
        public CompileRequest() {}
    }

    public static class ErrorResponse {
        public final String error;
        public ErrorResponse(String error) { 
            this.error = error; 
        }
    }

    public static class HealthResponse {
        public final String status;
        public final int    port;
        public HealthResponse(String status, int port) { 
            this.status = status; 
            this.port = port; 
        }
    }
}