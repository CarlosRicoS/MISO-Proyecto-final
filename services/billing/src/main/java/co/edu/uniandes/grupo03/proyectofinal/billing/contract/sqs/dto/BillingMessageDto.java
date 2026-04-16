package co.edu.uniandes.grupo03.proyectofinal.billing.contract.sqs.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.Value;

import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BillingMessageDto {

    private String operation;
    private Map<String, Object> payload;
}
