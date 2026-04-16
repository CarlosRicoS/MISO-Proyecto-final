package co.edu.uniandes.grupo03.proyectofinal.billing.business.command;

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

class CommandHandlerTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void handle_shouldThrowIllegalArgumentExceptionWhenCommandIsNull() {
        // Given
        FakeCommandHandler handler = new FakeCommandHandler(validator, new ValidCommandResponse("ok"));

        // When / Then
        assertThatThrownBy(() -> handler.handle(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("The command to process cannot be null.");

        assertThat(handler.wasCalled()).isFalse();
    }

    @Test
    void handle_shouldThrowInvalidInputDataExceptionWhenBeanValidationFails() {
        // Given
        FakeCommandHandler handler = new FakeCommandHandler(validator, new ValidCommandResponse("ok"));
        TestCommand invalidCommand = new TestCommand("", List.of());

        // When / Then
        assertThatThrownBy(() -> handler.handle(invalidCommand))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("name - The command name cannot be empty.");

        assertThat(handler.wasCalled()).isFalse();
    }

    @Test
    void handle_shouldThrowInvalidInputDataExceptionWhenPostValidationsFail() {
        // Given
        FakeCommandHandler handler = new FakeCommandHandler(validator, new ValidCommandResponse("ok"));
        TestCommand commandWithPostValidationErrors = new TestCommand("valid-name", List.of("The command post validation failed."));

        // When / Then
        assertThatThrownBy(() -> handler.handle(commandWithPostValidationErrors))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("The command post validation failed.");

        assertThat(handler.wasCalled()).isFalse();
    }

    @Test
    void handle_shouldReturnResponseWhenCommandIsValid() {
        // Given
        ValidCommandResponse expectedResponse = new ValidCommandResponse("ok");
        FakeCommandHandler handler = new FakeCommandHandler(validator, expectedResponse);
        TestCommand validCommand = new TestCommand("valid-name", List.of());

        // When
        CommandResponse response = handler.handle(validCommand);

        // Then
        assertThat(response).isSameAs(expectedResponse);
        assertThat(handler.wasCalled()).isTrue();
    }

    @Test
    void handle_shouldThrowInvalidResponseDataExceptionWhenResponseValidationFails() {
        // Given
        FakeCommandHandler handler = new FakeCommandHandler(validator, new InvalidCommandResponse(""));
        TestCommand validCommand = new TestCommand("valid-name", List.of());

        // When / Then
        assertThatThrownBy(() -> handler.handle(validCommand))
                .isInstanceOf(InvalidResponseDataException.class)
                .hasMessageContaining("status - The response status cannot be empty.");

        assertThat(handler.wasCalled()).isTrue();
    }

    private static class FakeCommandHandler extends CommandHandler<TestCommand, CommandResponse> {

        private final CommandResponse response;

        private boolean called;

        FakeCommandHandler(Validator validator, CommandResponse response) {
            super(validator);
            this.response = response;
        }

        @Override
        protected CommandResponse handleCommand(TestCommand command) {
            called = true;
            return response;
        }

        boolean wasCalled() {
            return called;
        }
    }

    private record TestCommand(
            @NotBlank(message = "The command name cannot be empty.")
            String name,
            List<String> postValidationErrors
    ) implements Command {
        @Override
        public List<String> executePostValidations() {
            return postValidationErrors;
        }
    }

    private record ValidCommandResponse(
            @NotBlank(message = "The response status cannot be empty.")
            String status
    ) implements CommandResponse {
    }

    private record InvalidCommandResponse(
            @NotBlank(message = "The response status cannot be empty.")
            String status
    ) implements CommandResponse {
    }
}

