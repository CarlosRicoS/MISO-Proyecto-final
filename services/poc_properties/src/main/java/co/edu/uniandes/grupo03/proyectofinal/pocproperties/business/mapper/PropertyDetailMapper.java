package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.mapper;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail.SearchPropertiesQueryResponse;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail.SearchPropertyByIdQueryResponse;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.PropertyDetailEntity;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PropertyDetailMapper {

    SearchPropertiesQueryResponse.PropertyResult toPropertyResult(PropertyDetailEntity entity);

    SearchPropertyByIdQueryResponse toSearchByIdResponse(PropertyDetailEntity entity);
}
