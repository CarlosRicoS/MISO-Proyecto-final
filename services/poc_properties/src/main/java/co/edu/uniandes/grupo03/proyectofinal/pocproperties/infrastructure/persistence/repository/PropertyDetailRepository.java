package co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.PropertyDetailEntity;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.CrudRepository;

public interface PropertyDetailRepository extends CrudRepository<PropertyDetailEntity, String>,
        JpaSpecificationExecutor<PropertyDetailEntity> {

}
