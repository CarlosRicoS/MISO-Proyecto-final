package co.edu.uniandes.grupo03.proyectofinal.stripe.api.controller;

import co.edu.uniandes.grupo03.proyectofinal.stripe.api.dto.CancelConfirmOperationRequestDto;
import co.edu.uniandes.grupo03.proyectofinal.stripe.api.dto.CreateOperationRequestDto;
import co.edu.uniandes.grupo03.proyectofinal.stripe.api.dto.GeneralResponseDto;
import co.edu.uniandes.grupo03.proyectofinal.stripe.api.dto.StripeConfigurationDto;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class StripeControllerTest {

    @Test
    void createOperation_shouldReturnOkAndGenerateReferencePaymentId() {
        // Given
        StripeController controller = new StripeController();
        CreateOperationRequestDto request = new CreateOperationRequestDto(
                "tx-1",
                "COP",
                "card",
                new BigDecimal("100.00")
        );

        // When
        var response = controller.createOperation(request, Map.of("delay", "0"));

        // Then
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTransactionId()).isEqualTo("tx-1");
        assertThat(response.getBody().getReferencePaymentId()).isNotBlank();
    }

    @Test
    void confirmOperation_shouldReturnOkAndEchoReferencePaymentIdAndTransactionId() {
        // Given
        StripeController controller = new StripeController();
        CancelConfirmOperationRequestDto request = new CancelConfirmOperationRequestDto("ref-1", "tx-1");

        // When
        var response = controller.confirmOperation(request, Map.of("delay", "0"));

        // Then
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(new GeneralResponseDto("ref-1", "tx-1"));
    }

    @Test
    void cancelOperation_shouldReturnOkAndEchoReferencePaymentIdAndTransactionId() {
        // Given
        StripeController controller = new StripeController();
        CancelConfirmOperationRequestDto request = new CancelConfirmOperationRequestDto("ref-1", "tx-1");

        // When
        var response = controller.cancelOperation(request, Map.of("delay", "0"));

        // Then
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(new GeneralResponseDto("ref-1", "tx-1"));
    }

    @Test
    void configuration_shouldUpdateDelaysUsedByOperationsWhenHeaderDelayNotProvided() {
        // Given
        StripeController controller = new StripeController();
        StripeConfigurationDto configuration = new StripeConfigurationDto(0L, 0L, 0L);

        // When
        var configResponse = controller.cancelOperation(configuration);

        // Then
        assertThat(configResponse.getStatusCode().value()).isEqualTo(200);
        assertThat(configResponse.getBody()).isEqualTo(configuration);

        // And: operations with empty headers should use the configured delay (0)
        CreateOperationRequestDto createRequest = new CreateOperationRequestDto("tx-1", "COP", "card", new BigDecimal("100.00"));
        CancelConfirmOperationRequestDto confirmRequest = new CancelConfirmOperationRequestDto("ref-1", "tx-1");

        assertThat(controller.createOperation(createRequest, Map.of()).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.confirmOperation(confirmRequest, Map.of()).getStatusCode().value()).isEqualTo(200);
        assertThat(controller.cancelOperation(confirmRequest, Map.of()).getStatusCode().value()).isEqualTo(200);
    }
}

