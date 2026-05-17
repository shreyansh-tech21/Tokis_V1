package com.example.tokis.service;

import com.example.tokis.client.AnalyzerClient;
import com.example.tokis.entity.FileNode;
import com.example.tokis.entity.Repo;
import com.example.tokis.entity.MaskReference;
import com.example.tokis.repository.FileRepository;
import com.example.tokis.repository.MaskReferenceRepository;
import com.example.tokis.repository.RepoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class RepoService {
    private final RepoRepository repoRepository;
    private final FileRepository fileRepository;
    private final MaskReferenceRepository maskReferenceRepository;
    private final AnalyzerClient analyzerClient;


    public RepoService(
            RepoRepository repoRepository,
            FileRepository fileRepository,
            MaskReferenceRepository maskReferenceRepository,
            AnalyzerClient analyzerClient
    ) {
        this.repoRepository = repoRepository;
        this.fileRepository = fileRepository;
        this.maskReferenceRepository = maskReferenceRepository;
        this.analyzerClient = analyzerClient;
    }
    public Repo saveRepo(String repoName,String repoPath){
        Optional<Repo> existing= repoRepository.findByPath(repoPath);
        if(existing.isPresent()){
            return existing.get();
        }
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

    @Transactional
    public void deleteRepo(Long repoId) {
        Repo repo = repoRepository.findById(repoId)
                .orElseThrow(() -> new RuntimeException("Repo not found"));

        List<FileNode> files = fileRepository.findByRepoId(repoId);
        if (!files.isEmpty()) {
            fileRepository.deleteAll(files);
        }

        List<MaskReference> masks = maskReferenceRepository.findByRepo_Id(repoId);
        if (!masks.isEmpty()) {
            maskReferenceRepository.deleteAll(masks);
        }

        repoRepository.delete(repo);
    }
}
