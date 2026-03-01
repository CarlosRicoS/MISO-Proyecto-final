package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query;

import java.util.Collections;
import java.util.List;

public interface Query {

    default List<String> executePostValidations() {

        return Collections.emptyList();
    }
}
