package co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.PropertyDetailEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface PropertyDetailRepository extends CrudRepository<PropertyDetailEntity, String>,
        JpaSpecificationExecutor<PropertyDetailEntity> {

    List<PropertyDetailEntity> findAllBy(Pageable pageable);
}
