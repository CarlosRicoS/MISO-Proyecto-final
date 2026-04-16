package co.edu.uniandes.grupo03.proyectofinal.billing.business.exception;

import java.util.List;

public class InvalidInputDataException extends RuntimeException {

    public InvalidInputDataException(List<String> errors) {
        super("Invalid input data. Errors -> %s".formatted(errors));
    }
}
