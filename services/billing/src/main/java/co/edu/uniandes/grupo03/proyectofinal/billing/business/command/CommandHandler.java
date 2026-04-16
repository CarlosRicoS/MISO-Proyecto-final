package co.edu.uniandes.grupo03.proyectofinal.billing.business.command;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.InvalidInputDataException;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.InvalidResponseDataException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public abstract class CommandHandler<T extends Command, V extends CommandResponse> {

    private final Validator validator;

    public CommandHandler(Validator validator) {
        this.validator = validator;
    }

    @Transactional
    public V handle(T command) {
        this.validateCommand(command);
        V result = this.handleCommand(command);
        this.validateResponse(result);
        return result;
    }

    protected abstract V handleCommand(T command);

    private void validateCommand(T data) {
        if (data == null) {
            throw new IllegalArgumentException("The command to process cannot be null.");
        } else {
            List<String> errors = new ArrayList<>();
            errors.addAll(validateData(data));
            errors.addAll(data.executePostValidations());
            if (!errors.isEmpty()) {
                throw new InvalidInputDataException(errors);
            }
        }
    }

    private void validateResponse(V data) {

        List<String> errors = this.validateData(data);

        if (!errors.isEmpty()) {
            throw new InvalidResponseDataException(errors);
        }
    }

    private <Y> List<String> validateData(Y data) {
        Set<ConstraintViolation<Y>> violations = this.validator.validate(data, new Class[0]);
        return violations.stream().map((violation) -> {
            String message = violation.getMessage();
            String input = violation.getPropertyPath().toString();
            return input + " - " + message;
        }).toList();
    }
}
