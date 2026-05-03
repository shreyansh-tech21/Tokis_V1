package com.example.tokis.controller;

import com.example.tokis.entity.Repo;
import com.example.tokis.service.RepoService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/repos")
public class RepoController {
    private final RepoService repoService;
    public RepoController(RepoService repoService) {
        this.repoService = repoService;
    }

    @PostMapping
    public Repo createRepo(@RequestBody Repo repo){
        return repoService.saveRepo(repo.getName(),repo.getPath());
    }

    @PostMapping("/ingest")
    public Repo ingestRepo(@RequestBody Repo repo){
        return repoService.ingestRepo(repo.getName(),repo.getPath());
    }
}
