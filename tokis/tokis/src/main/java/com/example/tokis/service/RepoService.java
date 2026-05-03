package com.example.tokis.service;

import com.example.tokis.client.AnalyzerClient;
import com.example.tokis.entity.FileNode;
import com.example.tokis.entity.Repo;
import com.example.tokis.repository.FileRepository;
import com.example.tokis.repository.RepoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RepoService {
    private final RepoRepository repoRepository;
    private final FileRepository fileRepository;
    private final AnalyzerClient analyzerClient;


    public RepoService(RepoRepository repoRepository, FileRepository fileRepository, AnalyzerClient analyzerClient) {
        this.repoRepository = repoRepository;
        this.fileRepository = fileRepository;
        this.analyzerClient = analyzerClient;
    }
    public Repo saveRepo(String repoName,String repoPath){
        Repo repo=new Repo();
        repo.setName(repoName);
        repo.setPath(repoPath);
        return repoRepository.save(repo);
    }
    public Repo ingestRepo(String repoName, String repoPath) {
        Repo repo=new Repo();
        repo.setName(repoName);
        repo.setPath(repoPath);
        repoRepository.save(repo);

        List<String> files=analyzerClient.ingestRepo(repoPath);
        for(String file:files){
            System.out.println(file);
            FileNode fileNode=new FileNode();
            fileNode.setPath(file);
            fileNode.setRepo(repo);
            fileRepository.save(fileNode);
        }
        return repo;
    }
}
