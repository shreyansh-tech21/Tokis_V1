package com.example.tokis.service;

import com.example.tokis.client.WorkerClient;
import com.example.tokis.entity.FileNode;
import com.example.tokis.model.SnippetDTO;
import com.example.tokis.repository.FileRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class QueryService {
    private final WorkerClient workerClient;
    private final FileRepository fileRepository;


    public QueryService(WorkerClient workerClient, FileRepository fileRepository) {
        this.workerClient = workerClient;
        this.fileRepository = fileRepository;
    }

    public List<SnippetDTO> queryFiles(Long repoId, String query){
        List<FileNode> files=fileRepository.findByRepoId(repoId);
        List<String> filePaths=files.stream().map(FileNode::getPath).toList();
        return workerClient.getSnippets(query,filePaths);
    }
}
