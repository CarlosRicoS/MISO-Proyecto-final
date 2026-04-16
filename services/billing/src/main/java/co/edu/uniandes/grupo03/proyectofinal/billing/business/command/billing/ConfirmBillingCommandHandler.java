package co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.CommandHandler;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.ResourceNotFoundException;
import co.edu.uniandes.grupo03.proyectofinal.billing.infrastructure.persistence.repository.BillingRepository;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class ConfirmBillingCommandHandler extends CommandHandler<ConfirmBillingCommand, EmptyCommandResponse> {

    private final BillingRepository billingRepository;

    public ConfirmBillingCommandHandler(Validator validator, BillingRepository billingRepository) {
        super(validator);
        this.billingRepository = billingRepository;
    }

    @Override
    protected EmptyCommandResponse handleCommand(ConfirmBillingCommand command) {

        var billing = billingRepository.findByBookingId(command.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("No billing found for booking id: " + command.getBookingId()));

        if (!billing.getState().equals("PENDING")) {

            throw new IllegalStateException("Billing for booking id: " + command.getBookingId() + " is not pending. Current status: " + billing.getState());
        }

        billing.setState("CONFIRMED");
        billing.setUpdateDate(LocalDateTime.now());
        billingRepository.save(billing);

        return EmptyCommandResponse.VALUE;
    }
}