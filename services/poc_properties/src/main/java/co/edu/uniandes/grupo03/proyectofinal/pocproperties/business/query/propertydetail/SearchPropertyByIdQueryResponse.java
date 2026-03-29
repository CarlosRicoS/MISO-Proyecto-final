package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.QueryResponse;
import lombok.Value;

import java.time.LocalTime;
import java.util.List;

@Value
public class SearchPropertyByIdQueryResponse implements QueryResponse {

    String id;

    String name;

    Integer maxCapacity;

    String description;

    List<String> photos;

    LocalTime checkInTime;

    LocalTime checkOutTime;

    String adminGroupId;

    List<ReviewDto> reviews;

    List<AmenityDto> amenities;

    @Value
    public static class ReviewDto {

        String id;

        String description;

        Integer rating;

        String name;
    }

    @Value
    public static class AmenityDto {

        String id;

        String description;
    }
}
