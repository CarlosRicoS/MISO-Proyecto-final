package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.CommandHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.ResourceAlreadyExistsException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.ResourceNotFoundException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.LockedPropertyEntity;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.LockedPropertyRepository;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.PropertyDetailRepository;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class LockPropertyCommandHandler extends CommandHandler<LockPropertyCommand, EmptyCommandResponse> {

    private final LockedPropertyRepository lockedPropertyRepository;

    private final PropertyDetailRepository propertyDetailRepository;

    public LockPropertyCommandHandler(Validator validator, LockedPropertyRepository lockedPropertyRepository,
                                      PropertyDetailRepository propertyDetailRepository) {
        super(validator);
        this.lockedPropertyRepository = lockedPropertyRepository;
        this.propertyDetailRepository = propertyDetailRepository;
    }

    @Override
    protected EmptyCommandResponse handleCommand(LockPropertyCommand command) {

        var propertyDetail = propertyDetailRepository.findById(command.getPropertyDetailId());

        if(propertyDetail.isEmpty()) {

            throw new ResourceNotFoundException("The property detail with the id %s does not exist.".formatted(command.getPropertyDetailId()));
        }

        var lockedProperties = lockedPropertyRepository.countLockedProperties(command.getStartDate(), command.getEndDate(), command.getPropertyDetailId());

        if(lockedProperties > 0) {

            throw new ResourceAlreadyExistsException("There are already %s locked properties with the given dates.".formatted(lockedProperties));
        }

        LockedPropertyEntity lockedPropertyEntity = new LockedPropertyEntity();
        lockedPropertyEntity.setIdLocked(UUID.randomUUID().toString());
        lockedPropertyEntity.setActive(true);
        lockedPropertyEntity.setStartDate(command.getStartDate());
        lockedPropertyEntity.setEndDate(command.getEndDate());
        lockedPropertyEntity.setPropertyDetail(propertyDetail.get());

        lockedPropertyRepository.save(lockedPropertyEntity);

        return EmptyCommandResponse.VALUE;
    }
}
