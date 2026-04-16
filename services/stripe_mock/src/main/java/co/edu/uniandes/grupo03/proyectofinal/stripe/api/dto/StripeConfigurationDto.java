package co.edu.uniandes.grupo03.proyectofinal.stripe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StripeConfigurationDto {

    private Long createOperationDelay = 1000L;

    private Long confirmOperationDelay = 1000L;

    private Long cancelOperationDelay = 1000L;
}
