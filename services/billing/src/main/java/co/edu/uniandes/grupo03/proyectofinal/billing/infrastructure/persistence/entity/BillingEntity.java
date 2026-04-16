package co.edu.uniandes.grupo03.proyectofinal.billing.infrastructure.persistence.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "billing")
public class BillingEntity {

    @Id
    private String id;

    private String bookingId;

    private LocalDateTime paymentDate;

    private LocalDateTime updateDate;

    private String paymentReference;

    private String adminGroupId;

    private BigDecimal value;

    private String state;

    private String reason;
}
