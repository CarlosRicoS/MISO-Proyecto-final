package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.Query;
import jakarta.validation.constraints.NotBlank;
import lombok.Value;

@Value
public class SearchPropertyByIdQuery implements Query {

    @NotBlank(message = "The id is required.")
    String id;
}
