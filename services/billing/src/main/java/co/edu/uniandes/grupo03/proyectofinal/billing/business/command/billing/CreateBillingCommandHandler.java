package co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.CommandHandler;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.billing.infrastructure.persistence.entity.BillingEntity;
import co.edu.uniandes.grupo03.proyectofinal.billing.infrastructure.persistence.repository.BillingRepository;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class CreateBillingCommandHandler extends CommandHandler<CreateBillingCommand, EmptyCommandResponse> {

    private static final String INITIAL_STATE = "PENDING";

    private final BillingRepository billingRepository;

    public CreateBillingCommandHandler(Validator validator, BillingRepository billingRepository) {
        super(validator);
        this.billingRepository = billingRepository;
    }

    @Override
    protected EmptyCommandResponse handleCommand(CreateBillingCommand command) {

        BillingEntity billingEntity = new BillingEntity();
        billingEntity.setId(UUID.randomUUID().toString());
        billingEntity.setPaymentDate(command.getPaymentDate());
        billingEntity.setBookingId(command.getBookingId());
        billingEntity.setUpdateDate(LocalDateTime.now());
        billingEntity.setPaymentReference(command.getPaymentReference());
        billingEntity.setAdminGroupId(command.getAdminGroupId());
        billingEntity.setValue(command.getValue());
        billingEntity.setState(INITIAL_STATE);
        billingRepository.save(billingEntity);
        return EmptyCommandResponse.VALUE;
    }
}

