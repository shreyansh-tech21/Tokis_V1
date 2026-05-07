package com.example.tokis.controller;

import com.example.tokis.client.WorkerClient;
import com.example.tokis.entity.FileNode;
import com.example.tokis.model.QueryResponse;
import com.example.tokis.model.SnippetDTO;
import com.example.tokis.repository.FileRepository;
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
    private final FileRepository fileRepository;
    private final WorkerClient workerClient;

    public QueryController(QueryService queryService, FileRepository fileRepository, WorkerClient workerClient) {
        this.queryService = queryService;
        this.fileRepository = fileRepository;
        this.workerClient = workerClient;
    }

    @PostMapping
    public List<SnippetDTO> search(@RequestBody Map<String,Object> request){
        Long repoId=Long.valueOf(request.get("repoId").toString());
        String query=request.get("query").toString();

        return queryService.queryFiles(repoId,query);
    }

    @PostMapping("/prompt")
    public QueryResponse getPrompt(@RequestBody Map<String,Object> request){
        Long repoId=Long.valueOf(request.get("repoId").toString());
        String query=request.get("query").toString();
        List<FileNode> files=fileRepository.findByRepoId(repoId);
        List<String> filePaths=files.stream().map(FileNode::getPath).toList();
        return workerClient.getQueryResponse(query,filePaths);
    }
}
