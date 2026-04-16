package co.edu.uniandes.grupo03.proyectofinal.billing.business.command;

import java.util.Collections;
import java.util.List;

public interface Command {

    default List<String> executePostValidations() {

        return Collections.emptyList();
    }
}
