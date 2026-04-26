package com.example.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.model.Transformation;
import com.example.demo.service.TokisEncoder;

import lombok.Data;

@RestController
@RequestMapping("/api/v1/tokis")
@CrossOrigin(origins = "*") // For local Extension development
public class TokisController {

    private final TokisEncoder encoder;

    public TokisController(TokisEncoder encoder) {
        this.encoder = encoder;
    }

    @PostMapping("/compress")
    public ResponseEntity<Transformation> compressPrompt(@RequestBody PromptRequest request) {
        Transformation result = encoder.encode(request.getPrompt());
        // In a real app, we would save this to the DB here:
        // transformationRepository.save(result);
        return ResponseEntity.ok(result);
    }
}

@Data
class PromptRequest {
    private String prompt;

    String getPrompt(){
        return this.prompt;
    }
}