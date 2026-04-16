package co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.Command;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
public class CancelBillingCommand implements Command {

    @NotBlank(message = "The booking id cannot be empty.")
    String bookingId;

    String reason;
}

