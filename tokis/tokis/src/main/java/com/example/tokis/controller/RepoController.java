package com.example.tokis.controller;

import com.example.tokis.entity.Repo;
import com.example.tokis.model.SnippetDTO;
import com.example.tokis.repository.RepoRepository;
import com.example.tokis.service.FileRefService;
import com.example.tokis.service.RepoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/repos")
public class RepoController {
    private final RepoService repoService;
    private final RepoRepository repoRepository;
    private final FileRefService fileRefService;

    public RepoController(
            RepoService repoService,
            RepoRepository repoRepository,
            FileRefService fileRefService
    ) {
        this.repoService = repoService;
        this.repoRepository = repoRepository;
        this.fileRefService = fileRefService;
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

    @GetMapping("/{repoId}")
    public Repo getRepo(@PathVariable Long repoId) {
        return repoRepository.findById(repoId)
                .orElseThrow(() -> new RuntimeException("Repo not found"));
    }

    @DeleteMapping("/{repoId}")
    public Map<String, String> deleteRepo(@PathVariable Long repoId) {
        repoService.deleteRepo(repoId);
        return Map.of("status", "deleted", "repoId", String.valueOf(repoId));
    }

    @GetMapping("/{repoId}/files")
    public List<String> listRepoFiles(@PathVariable Long repoId) {
        return fileRefService.listPaths(repoId);
    }

    @PostMapping("/{repoId}/files/resolve")
    public List<SnippetDTO> resolveFileReferences(
            @PathVariable Long repoId,
            @RequestBody Map<String, List<String>> body
    ) {
        List<String> references = body.get("references");
        return fileRefService.resolve(repoId, references);
    }
}
