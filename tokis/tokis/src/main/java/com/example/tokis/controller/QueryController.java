package com.example.tokis.controller;

import com.example.tokis.model.SnippetDTO;
import com.example.tokis.service.QueryService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/query")
public class QueryController {
    private final QueryService queryService;

    public QueryController(QueryService queryService) {
        this.queryService = queryService;
    }

    @PostMapping
    public List<SnippetDTO> search(@RequestBody Map<String,Object> request){
        Long repoId=Long.valueOf(request.get("repoId").toString());
        String query=request.get("query").toString();

        return queryService.queryFiles(repoId,query);
    }
}
