package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.Query;
import jakarta.validation.constraints.Positive;
import lombok.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.util.ObjectUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;


@Value
public class SearchPropertiesQuery implements Query {

    @DateTimeFormat(pattern = "dd/MM/yyyy")
    LocalDate startDate;

    @DateTimeFormat(pattern = "dd/MM/yyyy")
    LocalDate endDate;

    String city;

    @Positive(message = "The capacity must be a positive value.")
    Integer capacity;

    @Override
    public List<String> executePostValidations() {

        if (isNoFiltersQuery() || isOnlyStartDateFilterQuery() || isOnlyCityFilterQuery() || isOnlyCapacityFilterQuery()) {

            return List.of();
        }

        List<String> errors = new ArrayList<>();

        if (ObjectUtils.isEmpty(startDate)) {

            errors.add("The start date is required.");
        }

        if (ObjectUtils.isEmpty(endDate)) {

            errors.add("The end date is required.");
        }

        if (ObjectUtils.isEmpty(city)) {

            errors.add("The city is required.");
        }

        if (ObjectUtils.isEmpty(capacity)) {

            errors.add("The capacity is required.");
        }

        if (!ObjectUtils.isEmpty(startDate) && !ObjectUtils.isEmpty(endDate) && startDate.isAfter(endDate)) {

            errors.add("The start date cannot be greater than end date.");
        }

        return errors;
    }

    public boolean isOnlyCapacityFilterQuery() {
        return startDate == null && endDate == null && city == null && capacity != null;
    }

    public boolean isOnlyCityFilterQuery() {
        return startDate == null && endDate == null && city != null && capacity == null;
    }

    public boolean isOnlyStartDateFilterQuery() {
        return startDate != null && endDate == null && city == null && capacity == null;
    }

    public boolean isNoFiltersQuery() {
        return startDate == null && endDate == null && city == null && capacity == null;
    }
}
