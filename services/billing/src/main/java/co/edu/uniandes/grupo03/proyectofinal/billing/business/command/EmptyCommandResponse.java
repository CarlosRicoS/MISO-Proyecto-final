package co.edu.uniandes.grupo03.proyectofinal.billing.business.command;

public final class EmptyCommandResponse implements CommandResponse{

    public static final EmptyCommandResponse VALUE = new EmptyCommandResponse();

    private EmptyCommandResponse() {
    }
}
