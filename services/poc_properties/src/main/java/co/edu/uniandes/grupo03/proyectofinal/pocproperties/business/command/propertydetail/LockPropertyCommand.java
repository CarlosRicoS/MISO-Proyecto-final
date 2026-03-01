package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.Command;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Value;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@Value
public class LockPropertyCommand implements Command {

    @NotNull(message = "The start date cannot be null.")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd/MM/yyyy")
    LocalDate startDate;

    @NotNull(message = "The end date cannot be null.")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd/MM/yyyy")
    LocalDate endDate;

    @NotBlank(message = "The property detail id cannot be empty.")
    String propertyDetailId;

    @Override
    public List<String> executePostValidations() {

        if (startDate != null && endDate != null && (startDate.isEqual(endDate) || startDate.isAfter(endDate))) {

            return List.of("The start date cannot be greater or equals to end date.");
        }

        return Collections.emptyList();
    }
}
