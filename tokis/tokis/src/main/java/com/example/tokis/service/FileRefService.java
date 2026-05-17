package com.example.tokis.service;

import com.example.tokis.entity.FileNode;
import com.example.tokis.entity.Repo;
import com.example.tokis.model.SnippetDTO;
import com.example.tokis.repository.FileRepository;
import com.example.tokis.repository.RepoRepository;
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
    private final RepoRepository repoRepository;

    public FileRefService(FileRepository fileRepository, RepoRepository repoRepository) {
        this.fileRepository = fileRepository;
        this.repoRepository = repoRepository;
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

        Repo repo = repoRepository.findById(repoId)
                .orElseThrow(() -> new RuntimeException("Repo not found"));
        String repoRoot = normalizePath(repo.getPath());

        List<FileNode> repoFiles = fileRepository.findByRepoId(repoId);
        List<SnippetDTO> results = new ArrayList<>();

        for (String ref : references) {
            findMatch(repoFiles, normalizeRef(ref, repoRoot), repoRoot).ifPresent(file -> {
                String absolutePath = normalizePath(file.getPath());
                SnippetDTO dto = new SnippetDTO();
                dto.setFile(absolutePath);
                dto.setRelativePath(toRelativePath(absolutePath, repoRoot));
                dto.setLine(1L);
                dto.setSnippet(readContent(absolutePath));
                results.add(dto);
            });
        }

        return results;
    }

    private Optional<FileNode> findMatch(List<FileNode> files, String ref, String repoRoot) {
        String normalized = normalizeRef(ref);
        if (normalized.isEmpty()) {
            return Optional.empty();
        }

        String normLower = normalized.toLowerCase(Locale.ROOT);

        List<FileNode> candidates = new ArrayList<>();
        for (FileNode file : files) {
            String path = normalizePath(file.getPath());
            String rel = toRelativePath(path, repoRoot);
            String relLower = rel.toLowerCase(Locale.ROOT);
            String pathLower = path.toLowerCase(Locale.ROOT);

            if (path.equalsIgnoreCase(normalized)
                    || rel.equalsIgnoreCase(normalized)
                    || pathLower.endsWith("/" + normLower)
                    || relLower.equals(normLower)) {
                candidates.add(file);
            }
        }

        if (candidates.size() == 1) {
            return Optional.of(candidates.get(0));
        }

        if (candidates.size() > 1) {
            if (!normLower.contains("/")) {
                return Optional.empty();
            }
            Optional<FileNode> exact = candidates.stream()
                    .filter(f -> toRelativePath(f.getPath(), repoRoot).equalsIgnoreCase(normalized))
                    .findFirst();
            if (exact.isPresent()) {
                return exact;
            }
            List<FileNode> suffixOnly = candidates.stream()
                    .filter(f -> toRelativePath(f.getPath(), repoRoot).toLowerCase(Locale.ROOT)
                            .endsWith("/" + normLower))
                    .toList();
            if (suffixOnly.size() == 1) {
                return Optional.of(suffixOnly.get(0));
            }
            return Optional.empty();
        }

        List<FileNode> basenameMatches = new ArrayList<>();
        for (FileNode file : files) {
            if (basename(file.getPath()).equalsIgnoreCase(normalized)) {
                basenameMatches.add(file);
            }
        }

        if (basenameMatches.size() == 1) {
            return Optional.of(basenameMatches.get(0));
        }

        if (basenameMatches.size() > 1) {
            return Optional.empty();
        }

        List<FileNode> containsMatches = new ArrayList<>();
        for (FileNode file : files) {
            String pathLower = normalizePath(file.getPath()).toLowerCase(Locale.ROOT);
            String relLower = toRelativePath(file.getPath(), repoRoot).toLowerCase(Locale.ROOT);
            if (pathLower.contains(normLower) || relLower.contains(normLower)) {
                containsMatches.add(file);
            }
        }

        if (containsMatches.size() == 1) {
            return Optional.of(containsMatches.get(0));
        }

        return Optional.empty();
    }

    private String toRelativePath(String filePath, String repoRoot) {
        String norm = normalizePath(filePath);
        String root = normalizePath(repoRoot).replaceAll("/$", "");
        if (root.isEmpty()) {
            return norm;
        }
        String prefix = root.toLowerCase(Locale.ROOT) + "/";
        if (norm.toLowerCase(Locale.ROOT).startsWith(prefix)) {
            return norm.substring(root.length() + 1);
        }
        return norm;
    }

    private String normalizeRef(String ref, String repoRoot) {
        if (ref == null) {
            return "";
        }
        String rel = ref.trim()
                .replace('\\', '/')
                .replaceAll("^[@/]+", "")
                .replaceAll("^\\./+", "");

        String root = normalizePath(repoRoot).replaceAll("/$", "");
        if (!root.isEmpty()) {
            String prefix = root.toLowerCase(Locale.ROOT) + "/";
            if (rel.toLowerCase(Locale.ROOT).startsWith(prefix)) {
                rel = rel.substring(root.length() + 1);
            }
        }

        String rootName = basename(root);
        while (!rootName.isEmpty() && rel.toLowerCase(Locale.ROOT).startsWith(rootName.toLowerCase(Locale.ROOT) + "/")) {
            rel = rel.substring(rootName.length() + 1);
        }
        return rel;
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
