package com.example.tokis.model;

import lombok.Data;

import java.util.List;

@Data
public class QueryResponse {
    private List<SnippetDTO> snippets;
}
