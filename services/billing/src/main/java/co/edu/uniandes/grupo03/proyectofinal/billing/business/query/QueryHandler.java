package co.edu.uniandes.grupo03.proyectofinal.billing.business.query;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.InvalidInputDataException;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.InvalidResponseDataException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public abstract class QueryHandler<Q extends Query, R extends QueryResponse> {

    private final Validator validator;

    public QueryHandler(Validator validator) {
        this.validator = validator;
    }

    public R execute(Q query) {

        validateQuery(query);
        var response = executeQuery(query);
        validateResponse(response);
        return response;
    }

    protected abstract R executeQuery(Q query);

    private void validateQuery(Q data) {

        if (data == null) {

            throw new IllegalArgumentException("The query to execute cannot be null.");
        }

        List<String> errors = new ArrayList<>();
        errors.addAll(validateData(data));
        errors.addAll(data.executePostValidations());
        if (!errors.isEmpty()) {

            throw new InvalidInputDataException(errors);
        }
    }

    private void validateResponse(R data) {

        var errors = validateData(data);
        if (!errors.isEmpty()) {
            throw new InvalidResponseDataException(errors);
        }
    }

    private <Y> List<String> validateData(Y data) {

        Set<ConstraintViolation<Y>> violations = validator.validate(data);
        return violations.stream().map(ConstraintViolation::getMessage).toList();
    }
}
