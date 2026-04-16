package co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.ResourceNotFoundException;
import co.edu.uniandes.grupo03.proyectofinal.billing.infrastructure.persistence.entity.BillingEntity;
import co.edu.uniandes.grupo03.proyectofinal.billing.infrastructure.persistence.repository.BillingRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConfirmBillingCommandHandlerTest {

    @Mock
    private BillingRepository billingRepository;

    private Validator validator;

    private ConfirmBillingCommandHandler handler;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
        handler = new ConfirmBillingCommandHandler(validator, billingRepository);
    }

    @Test
    void handleCommand_shouldConfirmPendingBillingSuccessfully() {
        // Given
        ConfirmBillingCommand command = new ConfirmBillingCommand("booking-123");
        BillingEntity billing = createBillingEntity("booking-123", "PENDING");

        when(billingRepository.findByBookingId("booking-123")).thenReturn(Optional.of(billing));
        when(billingRepository.save(billing)).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        EmptyCommandResponse response = handler.handle(command);

        // Then
        assertThat(response).isSameAs(EmptyCommandResponse.VALUE);

        ArgumentCaptor<BillingEntity> captor = ArgumentCaptor.forClass(BillingEntity.class);
        verify(billingRepository).save(captor.capture());

        BillingEntity savedEntity = captor.getValue();
        assertThat(savedEntity.getBookingId()).isEqualTo("booking-123");
        assertThat(savedEntity.getState()).isEqualTo("CONFIRMED");
        assertThat(savedEntity.getUpdateDate()).isNotNull();
    }

    @Test
    void handleCommand_shouldThrowResourceNotFoundExceptionWhenBillingDoesNotExist() {
        // Given
        ConfirmBillingCommand command = new ConfirmBillingCommand("booking-missing");
        when(billingRepository.findByBookingId("booking-missing")).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("No billing found for booking id: booking-missing");

        verify(billingRepository).findByBookingId("booking-missing");
        verify(billingRepository, never()).save(any());
    }

    @Test
    void handleCommand_shouldThrowIllegalStateExceptionWhenBillingIsNotPending() {
        // Given
        ConfirmBillingCommand command = new ConfirmBillingCommand("booking-123");
        BillingEntity billing = createBillingEntity("booking-123", "CONFIRMED");

        when(billingRepository.findByBookingId("booking-123")).thenReturn(Optional.of(billing));

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("is not pending");

        verify(billingRepository).findByBookingId("booking-123");
        verify(billingRepository, never()).save(any());
    }

    private BillingEntity createBillingEntity(String bookingId, String state) {
        BillingEntity billing = new BillingEntity();
        billing.setId("billing-1");
        billing.setBookingId(bookingId);
        billing.setPaymentDate(LocalDateTime.of(2026, 4, 16, 10, 0));
        billing.setUpdateDate(LocalDateTime.of(2026, 4, 16, 10, 5));
        billing.setPaymentReference("payment-ref-1");
        billing.setAdminGroupId("admin-group-1");
        billing.setValue(new java.math.BigDecimal("150.00"));
        billing.setState(state);
        return billing;
    }
}

