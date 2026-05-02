package com.example.tokis.service;

import com.example.tokis.entity.Repo;
import com.example.tokis.repository.RepoRepository;
import org.springframework.stereotype.Service;

@Service
public class RepoService {
    private final RepoRepository repoRepository;


    public RepoService(RepoRepository repoRepository) {
        this.repoRepository = repoRepository;
    }

    public Repo saveRepo(String repoName, String repoPath) {
        Repo repo=new Repo();
        repo.setName(repoName);
        repo.setPath(repoPath);
        return repoRepository.save(repo);
    }
}
