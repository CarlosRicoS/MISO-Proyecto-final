package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command;

public final class EmptyCommandResponse implements CommandResponse{

    public static final EmptyCommandResponse VALUE = new EmptyCommandResponse();

    private EmptyCommandResponse() {
    }
}
