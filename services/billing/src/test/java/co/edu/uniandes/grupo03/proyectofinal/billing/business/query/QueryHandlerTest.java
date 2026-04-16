package co.edu.uniandes.grupo03.proyectofinal.billing.business.query;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.InvalidInputDataException;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.InvalidResponseDataException;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class QueryHandlerTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void execute_shouldThrowIllegalArgumentExceptionWhenQueryIsNull() {
        // Given
        FakeQueryHandler handler = new FakeQueryHandler(validator, new ValidQueryResponse("ok"));

        // When / Then
        assertThatThrownBy(() -> handler.execute(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("The query to execute cannot be null.");

        assertThat(handler.wasCalled()).isFalse();
    }

    @Test
    void execute_shouldThrowInvalidInputDataExceptionWhenBeanValidationFails() {
        // Given
        FakeQueryHandler handler = new FakeQueryHandler(validator, new ValidQueryResponse("ok"));
        TestQuery invalidQuery = new TestQuery("", List.of());

        // When / Then
        assertThatThrownBy(() -> handler.execute(invalidQuery))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("The query name cannot be empty.");

        assertThat(handler.wasCalled()).isFalse();
    }

    @Test
    void execute_shouldThrowInvalidInputDataExceptionWhenPostValidationsFail() {
        // Given
        FakeQueryHandler handler = new FakeQueryHandler(validator, new ValidQueryResponse("ok"));
        TestQuery queryWithPostValidationErrors = new TestQuery("valid-name", List.of("The query post validation failed."));

        // When / Then
        assertThatThrownBy(() -> handler.execute(queryWithPostValidationErrors))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("The query post validation failed.");

        assertThat(handler.wasCalled()).isFalse();
    }

    @Test
    void execute_shouldReturnResponseWhenQueryIsValid() {
        // Given
        ValidQueryResponse expectedResponse = new ValidQueryResponse("ok");
        FakeQueryHandler handler = new FakeQueryHandler(validator, expectedResponse);
        TestQuery validQuery = new TestQuery("valid-name", List.of());

        // When
        QueryResponse response = handler.execute(validQuery);

        // Then
        assertThat(response).isSameAs(expectedResponse);
        assertThat(handler.wasCalled()).isTrue();
    }

    @Test
    void execute_shouldThrowInvalidResponseDataExceptionWhenResponseValidationFails() {
        // Given
        FakeQueryHandler handler = new FakeQueryHandler(validator, new InvalidQueryResponse(""));
        TestQuery validQuery = new TestQuery("valid-name", List.of());

        // When / Then
        assertThatThrownBy(() -> handler.execute(validQuery))
                .isInstanceOf(InvalidResponseDataException.class)
                .hasMessageContaining("The response status cannot be empty.");

        assertThat(handler.wasCalled()).isTrue();
    }

    private static class FakeQueryHandler extends QueryHandler<TestQuery, QueryResponse> {

        private final QueryResponse response;

        private boolean called;

        FakeQueryHandler(Validator validator, QueryResponse response) {
            super(validator);
            this.response = response;
        }

        @Override
        protected QueryResponse executeQuery(TestQuery query) {
            called = true;
            return response;
        }

        boolean wasCalled() {
            return called;
        }
    }

    private record TestQuery(
            @NotBlank(message = "The query name cannot be empty.")
            String name,
            List<String> postValidationErrors
    ) implements Query {
        @Override
        public List<String> executePostValidations() {
            return postValidationErrors;
        }
    }

    private record ValidQueryResponse(
            @NotBlank(message = "The response status cannot be empty.")
            String status
    ) implements QueryResponse {
    }

    private record InvalidQueryResponse(
            @NotBlank(message = "The response status cannot be empty.")
            String status
    ) implements QueryResponse {
    }
}

