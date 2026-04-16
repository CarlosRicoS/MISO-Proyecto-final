package co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.Command;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
public class CreateBillingCommand implements Command {

    @NotBlank(message = "The booking id cannot be empty.")
    String bookingId;

    @NotBlank(message = "The payment reference cannot be empty.")
    String paymentReference;

    @NotNull(message = "The payment date cannot be null.")
    LocalDateTime paymentDate;

    @NotBlank(message = "The admin group id cannot be empty.")
    String adminGroupId;

    @Positive(message = "The value must be positive.")
    @NotNull(message = "The value cannot be null.")
    BigDecimal value;
}

