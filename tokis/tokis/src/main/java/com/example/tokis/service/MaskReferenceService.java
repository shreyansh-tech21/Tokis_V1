package com.example.tokis.service;

import com.example.tokis.entity.MaskReference;
import com.example.tokis.entity.Repo;
import com.example.tokis.repository.MaskReferenceRepository;
import com.example.tokis.repository.RepoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class MaskReferenceService {

    private static final Pattern TOKEN_PATTERN = Pattern.compile("\\bMASK(\\d+)\\b");

    private final MaskReferenceRepository maskReferenceRepository;
    private final RepoRepository repoRepository;

    public MaskReferenceService(
            MaskReferenceRepository maskReferenceRepository,
            RepoRepository repoRepository
    ) {
        this.maskReferenceRepository = maskReferenceRepository;
        this.repoRepository = repoRepository;
    }

    @Transactional
    public void saveMaskSet(Long repoId, String maskSetId, Map<String, String> tokens) {
        Repo repo = repoRepository.findById(repoId)
                .orElseThrow(() -> new RuntimeException("Repo not found"));

        List<MaskReference> existing = maskReferenceRepository.findByRepo_IdAndMaskSetId(repoId, maskSetId);
        if (!existing.isEmpty()) {
            maskReferenceRepository.deleteAll(existing);
        }

        if (tokens == null || tokens.isEmpty()) {
            return;
        }

        for (Map.Entry<String, String> entry : tokens.entrySet()) {
            String token = normalizeToken(entry.getKey());
            String value = entry.getValue();
            if (token.isEmpty() || value == null || value.isBlank()) {
                continue;
            }
            MaskReference row = new MaskReference();
            row.setRepo(repo);
            row.setMaskSetId(maskSetId);
            row.setToken(token);
            row.setValue(value);
            maskReferenceRepository.save(row);
        }
    }

    public Map<String, String> getMaskSet(Long repoId, String maskSetId) {
        List<MaskReference> rows = maskReferenceRepository.findByRepo_IdAndMaskSetId(repoId, maskSetId);
        Map<String, String> tokens = new LinkedHashMap<>();
        for (MaskReference row : rows) {
            tokens.put(row.getToken(), row.getValue());
        }
        return tokens;
    }

    public String demask(Long repoId, String maskSetId, String text) {
        if (text == null || text.isBlank()) {
            return text == null ? "" : text;
        }
        Map<String, String> tokens = getMaskSet(repoId, maskSetId);
        if (tokens.isEmpty()) {
            return text;
        }

        String result = text;
        List<String> sorted = tokens.keySet().stream()
                .sorted((a, b) -> Integer.compare(b.length(), a.length()))
                .toList();

        for (String token : sorted) {
            result = result.replace(token, tokens.get(token));
        }
        return result;
    }

    public String demaskWithTokens(String text, Map<String, String> tokens) {
        if (text == null || tokens == null || tokens.isEmpty()) {
            return text == null ? "" : text;
        }
        String result = text;
        List<String> sorted = tokens.keySet().stream()
                .sorted((a, b) -> Integer.compare(b.length(), a.length()))
                .toList();
        for (String token : sorted) {
            result = result.replace(token, tokens.get(token));
        }
        return result;
    }

    private String normalizeToken(String token) {
        if (token == null) {
            return "";
        }
        String trimmed = token.trim().toUpperCase();
        if (TOKEN_PATTERN.matcher(trimmed).matches() || trimmed.matches("MASK\\d+")) {
            return trimmed;
        }
        return trimmed;
    }
}
