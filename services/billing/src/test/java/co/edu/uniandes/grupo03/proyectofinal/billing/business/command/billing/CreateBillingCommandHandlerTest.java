package co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.EmptyCommandResponse;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreateBillingCommandHandlerTest {

    private static final Pattern UUID_PATTERN = Pattern.compile("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

    @Mock
    private BillingRepository billingRepository;

    private Validator validator;

    private CreateBillingCommandHandler handler;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
        handler = new CreateBillingCommandHandler(validator, billingRepository);
    }

    @Test
    void handleCommand_shouldCreateBillingSuccessfully() {
        // Given
        LocalDateTime paymentDate = LocalDateTime.of(2026, 4, 16, 10, 15, 30);
        CreateBillingCommand command = new CreateBillingCommand(
                "booking-123",
                "payment-ref-456",
                paymentDate,
                "admin-group-789",
                new BigDecimal("1250.50")
        );

        when(billingRepository.save(any(BillingEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        EmptyCommandResponse response = handler.handle(command);

        // Then
        assertThat(response).isSameAs(EmptyCommandResponse.VALUE);

        ArgumentCaptor<BillingEntity> captor = ArgumentCaptor.forClass(BillingEntity.class);
        verify(billingRepository).save(captor.capture());

        BillingEntity savedEntity = captor.getValue();
        assertThat(savedEntity.getId()).isNotBlank();
        assertThat(savedEntity.getId()).matches(UUID_PATTERN);
        assertThat(savedEntity.getBookingId()).isEqualTo("booking-123");
        assertThat(savedEntity.getPaymentDate()).isEqualTo(paymentDate);
        assertThat(savedEntity.getPaymentReference()).isEqualTo("payment-ref-456");
        assertThat(savedEntity.getAdminGroupId()).isEqualTo("admin-group-789");
        assertThat(savedEntity.getValue()).isEqualByComparingTo("1250.50");
        assertThat(savedEntity.getState()).isEqualTo("PENDING");
        assertThat(savedEntity.getUpdateDate()).isNotNull();
    }
}

