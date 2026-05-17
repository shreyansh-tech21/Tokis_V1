package com.example.tokis.controller;

import com.example.tokis.service.MaskReferenceService;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/repos/{repoId}/mask-sets")
public class MaskController {

    private final MaskReferenceService maskReferenceService;

    public MaskController(MaskReferenceService maskReferenceService) {
        this.maskReferenceService = maskReferenceService;
    }

    @PostMapping
    public Map<String, Object> saveMaskSet(
            @PathVariable Long repoId,
            @RequestBody Map<String, Object> body
    ) {
        String maskSetId = String.valueOf(body.get("maskSetId"));
        if (maskSetId.isBlank() || "null".equals(maskSetId)) {
            throw new RuntimeException("maskSetId required");
        }

        Map<String, String> tokens = new LinkedHashMap<>();
        Object rawTokens = body.get("tokens");
        if (rawTokens instanceof Map<?, ?> rawMap) {
            rawMap.forEach((k, v) -> {
                if (k != null && v != null) {
                    tokens.put(String.valueOf(k), String.valueOf(v));
                }
            });
        }

        maskReferenceService.saveMaskSet(repoId, maskSetId, tokens);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("maskSetId", maskSetId);
        response.put("count", tokens.size());
        return response;
    }

    @GetMapping("/{maskSetId}")
    public Map<String, String> getMaskSet(
            @PathVariable Long repoId,
            @PathVariable String maskSetId
    ) {
        return maskReferenceService.getMaskSet(repoId, maskSetId);
    }

    @PostMapping("/{maskSetId}/demask")
    public Map<String, String> demask(
            @PathVariable Long repoId,
            @PathVariable String maskSetId,
            @RequestBody Map<String, String> body
    ) {
        String text = body.get("text");
        String demasked = maskReferenceService.demask(repoId, maskSetId, text);
        return Map.of("text", demasked);
    }
}
