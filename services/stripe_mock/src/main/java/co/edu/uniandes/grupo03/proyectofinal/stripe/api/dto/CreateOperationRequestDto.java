package co.edu.uniandes.grupo03.proyectofinal.stripe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateOperationRequestDto {

    private String transactionId;

    private String currency;

    private String paymentMethodType;

    private BigDecimal amount;
}
