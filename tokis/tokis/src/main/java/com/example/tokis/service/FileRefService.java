package com.example.tokis.service;

import com.example.tokis.entity.FileNode;
import com.example.tokis.model.SnippetDTO;
import com.example.tokis.repository.FileRepository;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class FileRefService {

    private static final int MAX_BYTES = 512_000;

    private final FileRepository fileRepository;

    public FileRefService(FileRepository fileRepository) {
        this.fileRepository = fileRepository;
    }

    public List<String> listPaths(Long repoId) {
        return fileRepository.findByRepoId(repoId).stream()
                .map(FileNode::getPath)
                .toList();
    }

    public List<SnippetDTO> resolve(Long repoId, List<String> references) {
        if (references == null || references.isEmpty()) {
            return List.of();
        }

        List<FileNode> repoFiles = fileRepository.findByRepoId(repoId);
        List<SnippetDTO> results = new ArrayList<>();

        for (String ref : references) {
            findMatch(repoFiles, ref).ifPresent(file -> {
                SnippetDTO dto = new SnippetDTO();
                dto.setFile(file.getPath());
                dto.setLine(1L);
                dto.setSnippet(readContent(file.getPath()));
                results.add(dto);
            });
        }

        return results;
    }

    private Optional<FileNode> findMatch(List<FileNode> files, String ref) {
        String normalized = normalizeRef(ref);
        if (normalized.isEmpty()) {
            return Optional.empty();
        }

        String normLower = normalized.toLowerCase(Locale.ROOT);

        for (FileNode file : files) {
            String path = normalizePath(file.getPath());
            if (path.equalsIgnoreCase(normalized) || path.toLowerCase(Locale.ROOT).endsWith("/" + normLower)) {
                return Optional.of(file);
            }
        }

        for (FileNode file : files) {
            if (basename(file.getPath()).equalsIgnoreCase(normalized)) {
                return Optional.of(file);
            }
        }

        for (FileNode file : files) {
            String pathLower = normalizePath(file.getPath()).toLowerCase(Locale.ROOT);
            if (pathLower.contains(normLower)) {
                return Optional.of(file);
            }
        }

        return Optional.empty();
    }

    private String normalizeRef(String ref) {
        if (ref == null) {
            return "";
        }
        return ref.trim()
                .replace('\\', '/')
                .replaceAll("^[@/]+", "");
    }

    private String normalizePath(String path) {
        return path.replace('\\', '/');
    }

    private String basename(String path) {
        String normalized = normalizePath(path);
        int slash = normalized.lastIndexOf('/');
        return slash >= 0 ? normalized.substring(slash + 1) : normalized;
    }

    private String readContent(String path) {
        try {
            Path filePath = Path.of(path);
            if (!Files.isRegularFile(filePath)) {
                return "";
            }
            long size = Files.size(filePath);
            if (size > MAX_BYTES) {
                byte[] bytes = Files.readAllBytes(filePath);
                String content = new String(bytes, 0, MAX_BYTES, StandardCharsets.UTF_8);
                return content + "\n... (truncated)";
            }
            return Files.readString(filePath, StandardCharsets.UTF_8);
        } catch (IOException e) {
            return "";
        }
    }
}
