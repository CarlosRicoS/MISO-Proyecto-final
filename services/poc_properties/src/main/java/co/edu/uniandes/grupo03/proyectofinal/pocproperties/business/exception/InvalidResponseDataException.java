package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception;

import java.util.List;

public class InvalidResponseDataException extends RuntimeException {

    public InvalidResponseDataException(List<String> errors) {
        super("Invalid response data. Errors -> %s".formatted(errors));
    }
}
