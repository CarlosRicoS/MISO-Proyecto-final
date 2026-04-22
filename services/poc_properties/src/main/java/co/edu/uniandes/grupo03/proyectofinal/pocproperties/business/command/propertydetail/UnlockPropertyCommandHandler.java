package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.CommandHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.ResourceNotFoundException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.LockedPropertyRepository;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.PropertyDetailRepository;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;

@Service
public class UnlockPropertyCommandHandler extends CommandHandler<UnlockPropertyCommand, EmptyCommandResponse> {

    private final LockedPropertyRepository lockedPropertyRepository;

    private final PropertyDetailRepository propertyDetailRepository;

    public UnlockPropertyCommandHandler(Validator validator, LockedPropertyRepository lockedPropertyRepository,
                                        PropertyDetailRepository propertyDetailRepository) {
        super(validator);
        this.lockedPropertyRepository = lockedPropertyRepository;
        this.propertyDetailRepository = propertyDetailRepository;
    }

    @Override
    protected EmptyCommandResponse handleCommand(UnlockPropertyCommand command) {

        var propertyDetail = propertyDetailRepository.findById(command.getPropertyDetailId());

        if(propertyDetail.isEmpty()) {

            throw new ResourceNotFoundException("The property detail with the id %s does not exist.".formatted(command.getPropertyDetailId()));
        }

        var lockedProperty = lockedPropertyRepository.findLockedProperty(command.getStartDate(), command.getEndDate(), command.getPropertyDetailId());

        if(lockedProperty.isEmpty()) {

            throw new ResourceNotFoundException("No locked property found with the given dates and property detail id.");
        }

        lockedPropertyRepository.delete(lockedProperty.get());

        return EmptyCommandResponse.VALUE;
    }
}

