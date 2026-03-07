package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.QueryResponse;
import lombok.Value;

import java.time.LocalTime;

@Value
public class SearchPropertyByIdQueryResponse implements QueryResponse {

    String id;

    String name;

    Integer maxCapacity;

    String description;

    String urlBucketPhotos;

    LocalTime checkInTime;

    LocalTime checkOutTime;

    String adminGroupId;
}
