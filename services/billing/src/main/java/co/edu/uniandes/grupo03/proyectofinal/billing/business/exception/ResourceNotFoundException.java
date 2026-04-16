package co.edu.uniandes.grupo03.proyectofinal.billing.business.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
