package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.QueryResponse;
import lombok.Value;

import java.time.LocalTime;
import java.util.List;

@Value
public class SearchPropertiesQueryResponse implements QueryResponse {

    List<PropertyResult> result;

    @Value
    public static class PropertyResult {

        String id;

        String name;

        String city;

        Integer maxCapacity;

        String description;

        List<String> photos;

        LocalTime checkInTime;

        LocalTime checkOutTime;

        String adminGroupId;
    }
}
