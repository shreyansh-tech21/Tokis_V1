package com.example.tokis.repository;

import com.example.tokis.entity.Repo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RepoRepository extends JpaRepository<Repo,Long> {
    Optional<Repo>
    findByPath(String path);
}
