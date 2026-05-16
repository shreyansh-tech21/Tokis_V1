package com.example.tokis.controller;

import com.example.tokis.entity.Repo;
import com.example.tokis.repository.RepoRepository;
import com.example.tokis.service.RepoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/repos")
public class RepoController {
    private final RepoService repoService;
    private final RepoRepository repoRepository;
    public RepoController(RepoService repoService, RepoRepository repoRepository) {
        this.repoService = repoService;
        this.repoRepository = repoRepository;
    }

    @PostMapping
    public Repo createRepo(@RequestBody Repo repo){
        return repoService.saveRepo(repo.getName(),repo.getPath());
    }

    @PostMapping("/ingest")
    public Repo ingestRepo(@RequestBody Repo repo){
        return repoService.ingestRepo(repo.getName(),repo.getPath());
    }

    @GetMapping
    public List<Repo> getRepos(){
        return repoRepository.findAll();
    }
}
