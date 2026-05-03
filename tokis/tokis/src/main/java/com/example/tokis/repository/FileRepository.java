package com.example.tokis.repository;

import com.example.tokis.entity.FileNode;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FileRepository extends JpaRepository<FileNode,Long> {

}
