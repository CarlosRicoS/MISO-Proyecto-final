package co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.Data;

import java.util.List;

@Data
@Entity
@Table(name = "amenity")
public class AmenityEntity {

    @Id
    private String id;

    private String description;

    @ManyToMany(mappedBy = "amenities")
    private List<PropertyDetailEntity> propertyDetails;
}
