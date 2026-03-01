package co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;

@Data
@Entity
@Table(name = "locked_property")
public class LockedPropertyEntity {

    @Id
    private String idLocked;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_detail_id")
    private PropertyDetailEntity propertyDetail;

    private LocalDate startDate;

    private LocalDate endDate;

    private boolean active;
}
