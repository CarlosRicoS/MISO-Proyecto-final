package co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalTime;
import java.util.List;

@Data
@Entity
@Table(name = "property_detail")
public class PropertyDetailEntity {

    @Id
    private String id;

    private String name;

    private String city;

    private Integer maxCapacity;

    private String description;

    private List<String> photos;

    private LocalTime checkInTime;

    private LocalTime checkOutTime;

    private String adminGroupId;

    @OneToMany(fetch = FetchType.LAZY, mappedBy = "propertyDetail")
    private List<LockedPropertyEntity> lockedDays;

    @OneToMany(fetch = FetchType.LAZY, mappedBy = "propertyDetail")
    private List<ReviewEntity> reviews;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "property_detail_amenities",
            joinColumns = @JoinColumn(name = "property_detail_id"),
            inverseJoinColumns = @JoinColumn(name = "amenity_id")
    )
    private List<AmenityEntity> amenities;
}
