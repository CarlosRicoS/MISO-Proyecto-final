package co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.Command;
import jakarta.validation.constraints.NotBlank;
import lombok.Value;

@Value
public class ConfirmBillingCommand implements Command {

    @NotBlank(message = "The booking id cannot be empty.")
    String bookingId;
}

