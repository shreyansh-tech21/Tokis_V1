package com.example.tokis.repository;

import com.example.tokis.entity.FileNode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FileRepository extends JpaRepository<FileNode,Long> {
    List<FileNode> findRepoById(Long repoId);
}
