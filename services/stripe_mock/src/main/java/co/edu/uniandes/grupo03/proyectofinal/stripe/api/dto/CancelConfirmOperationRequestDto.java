package co.edu.uniandes.grupo03.proyectofinal.stripe.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CancelConfirmOperationRequestDto {

    private String referencePaymentId;

    private String transactionId;
}
