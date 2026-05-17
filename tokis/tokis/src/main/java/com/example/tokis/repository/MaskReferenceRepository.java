package com.example.tokis.repository;

import com.example.tokis.entity.MaskReference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MaskReferenceRepository extends JpaRepository<MaskReference, Long> {
    List<MaskReference> findByRepo_IdAndMaskSetId(Long repoId, String maskSetId);

    List<MaskReference> findByRepo_Id(Long repoId);
}
