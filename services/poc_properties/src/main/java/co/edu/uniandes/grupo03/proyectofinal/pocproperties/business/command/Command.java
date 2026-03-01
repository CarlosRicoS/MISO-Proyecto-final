package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command;

import java.util.Collections;
import java.util.List;

public interface Command {

    default List<String> executePostValidations() {

        return Collections.emptyList();
    }
}
