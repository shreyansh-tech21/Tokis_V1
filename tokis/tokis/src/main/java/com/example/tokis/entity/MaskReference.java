package com.example.tokis.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "mask_reference",
        uniqueConstraints = @UniqueConstraint(columnNames = {"repo_id", "mask_set_id", "token"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MaskReference {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "repo_id")
    private Repo repo;

    @Column(name = "mask_set_id", nullable = false, length = 64)
    private String maskSetId;

    @Column(nullable = false, length = 32)
    private String token;

    @Column(nullable = false, length = 10000)
    private String value;
}
