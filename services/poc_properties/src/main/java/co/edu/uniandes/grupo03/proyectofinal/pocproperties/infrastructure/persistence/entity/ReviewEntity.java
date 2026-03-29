package co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "review")
public class ReviewEntity {

    @Id
    private String id;

    private String description;

    private Integer rating;

    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_detail_id")
    private PropertyDetailEntity propertyDetail;
}
