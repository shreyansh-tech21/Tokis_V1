package com.example.tokis.model;

import lombok.Data;

import java.util.List;

@Data
public class QueryResponse {
    private String prompt;
    private List<SnippetDTO> snippets;
}
