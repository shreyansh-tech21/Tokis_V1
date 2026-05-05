package com.example.tokis.model;

import lombok.Data;

@Data
public class SnippetDTO {
    private String file;
    private Long line;
    private String snippet;
}
