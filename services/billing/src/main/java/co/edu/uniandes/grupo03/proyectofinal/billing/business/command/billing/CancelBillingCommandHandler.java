package co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.CommandHandler;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.ResourceNotFoundException;
import co.edu.uniandes.grupo03.proyectofinal.billing.infrastructure.persistence.repository.BillingRepository;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class CancelBillingCommandHandler extends CommandHandler<CancelBillingCommand, EmptyCommandResponse> {

    private final BillingRepository billingRepository;

    public CancelBillingCommandHandler(Validator validator, BillingRepository billingRepository) {
        super(validator);
        this.billingRepository = billingRepository;
    }

    @Override
    protected EmptyCommandResponse handleCommand(CancelBillingCommand command) {

        var billing = billingRepository.findByBookingId(command.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("No billing found for booking id: " + command.getBookingId()));

        if (billing.getState().equals("CANCELLED")) {

            throw new IllegalStateException("Billing for booking id: " + command.getBookingId() + " is already cancelled.");
        }

        billing.setState("CANCELLED");
        billing.setUpdateDate(LocalDateTime.now());
        billing.setReason(command.getReason());
        billingRepository.save(billing);

        return EmptyCommandResponse.VALUE;
    }
}