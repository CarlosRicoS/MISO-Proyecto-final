package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
