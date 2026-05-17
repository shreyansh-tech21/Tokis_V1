package com.example.tokis.model;

import lombok.Data;

@Data
public class SnippetDTO {
    /** Absolute path on disk (internal). */
    private String file;
    /** Path relative to repo root (use in UI and LLM headers). */
    private String relativePath;
    private Long line;
    private String snippet;
}
