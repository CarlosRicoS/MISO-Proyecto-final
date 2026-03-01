package co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.LockedPropertyEntity;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;

public interface LockedPropertyRepository extends CrudRepository<LockedPropertyEntity, String> {


    @Query(value = "SELECT count(1) FROM locked_property WHERE property_detail_id = :propertyDetailId and start_date >= :startDate and end_date <= :endDate",
            nativeQuery = true)
    long countLockedProperties(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate, @Param("propertyDetailId") String propertyDetailId);
}
