package co.edu.uniandes.grupo03.proyectofinal.billing.business.exception;

public class ResourceAlreadyExistsException extends RuntimeException {
    public ResourceAlreadyExistsException(String message) {
        super(message);
    }
}
