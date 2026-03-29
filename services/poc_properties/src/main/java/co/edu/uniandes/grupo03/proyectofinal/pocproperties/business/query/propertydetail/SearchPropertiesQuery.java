package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.Query;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Value;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;


@Value
public class SearchPropertiesQuery implements Query {

    @NotNull(message = "The start date cannot be null.")
    @DateTimeFormat(pattern = "dd/MM/yyyy")
    LocalDate startDate;

    @NotNull(message = "The end date cannot be null.")
    @DateTimeFormat(pattern = "dd/MM/yyyy")
    LocalDate endDate;

    @NotBlank(message = "The city is required.")
    String city;

    @NotNull(message = "The capacity is required.")
    @Positive(message = "The capacity must be a positive value.")
    Integer capacity;

    @Override
    public List<String> executePostValidations() {

        if (startDate != null && endDate != null && (startDate.isEqual(endDate) || startDate.isAfter(endDate))) {

            return List.of("The start date cannot be greater or equals to end date.");
        }

        return Collections.emptyList();
    }

    public boolean isFirstPropertiesQuery() {
        return startDate == null && endDate == null && city == null && capacity == null;
    }
}
