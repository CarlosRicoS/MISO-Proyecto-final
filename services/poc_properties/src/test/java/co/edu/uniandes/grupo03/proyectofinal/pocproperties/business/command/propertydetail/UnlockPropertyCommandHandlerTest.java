package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.InvalidInputDataException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.ResourceNotFoundException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.LockedPropertyEntity;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.PropertyDetailEntity;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.LockedPropertyRepository;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.PropertyDetailRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UnlockPropertyCommandHandlerTest {

    @Mock
    private LockedPropertyRepository lockedPropertyRepository;

    @Mock
    private PropertyDetailRepository propertyDetailRepository;

    private Validator validator;

    private UnlockPropertyCommandHandler handler;

    @BeforeEach
    void setUp() {

        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
        handler = new UnlockPropertyCommandHandler(validator, lockedPropertyRepository, propertyDetailRepository);
    }

    @Test
    void handleCommand_shouldUnlockPropertySuccessfully() {
        // Given
        String propertyId = "property-123";
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        UnlockPropertyCommand command = new UnlockPropertyCommand(startDate, endDate, propertyId);

        PropertyDetailEntity propertyEntity = createPropertyDetailEntity(propertyId);
        LockedPropertyEntity lockedPropertyEntity = createLockedPropertyEntity(propertyId, startDate, endDate, propertyEntity);

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.of(propertyEntity));
        when(lockedPropertyRepository.findLockedProperty(startDate, endDate, propertyId)).thenReturn(Optional.of(lockedPropertyEntity));

        // When
        EmptyCommandResponse response = handler.handleCommand(command);

        // Then
        assertThat(response).isNotNull();
        assertThat(response).isEqualTo(EmptyCommandResponse.VALUE);

        verify(propertyDetailRepository).findById(propertyId);
        verify(lockedPropertyRepository).findLockedProperty(startDate, endDate, propertyId);
        verify(lockedPropertyRepository).delete(lockedPropertyEntity);
    }

    @Test
    void handleCommand_shouldThrowResourceNotFoundExceptionWhenPropertyDoesNotExist() {
        // Given
        String propertyId = "non-existent-id";
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        UnlockPropertyCommand command = new UnlockPropertyCommand(startDate, endDate, propertyId);

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> handler.handleCommand(command))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("The property detail with the id " + propertyId + " does not exist");

        verify(propertyDetailRepository).findById(propertyId);
        verify(lockedPropertyRepository, never()).findLockedProperty(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).delete(any());
    }

    @Test
    void handleCommand_shouldThrowResourceNotFoundExceptionWhenLockedPropertyDoesNotExist() {
        // Given
        String propertyId = "property-123";
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        UnlockPropertyCommand command = new UnlockPropertyCommand(startDate, endDate, propertyId);

        PropertyDetailEntity propertyEntity = createPropertyDetailEntity(propertyId);

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.of(propertyEntity));
        when(lockedPropertyRepository.findLockedProperty(startDate, endDate, propertyId)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> handler.handleCommand(command))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("No locked property found with the given dates and property detail id");

        verify(propertyDetailRepository).findById(propertyId);
        verify(lockedPropertyRepository).findLockedProperty(startDate, endDate, propertyId);
        verify(lockedPropertyRepository, never()).delete(any());
    }

    @Test
    void handleCommand_shouldThrowInvalidInputDataExceptionWhenStartDateIsAfterEndDate() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 10);
        LocalDate endDate = LocalDate.of(2024, 1, 1);
        String propertyId = "property-123";
        UnlockPropertyCommand command = new UnlockPropertyCommand(startDate, endDate, propertyId);

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("start date cannot be greater or equals to end date");

        verify(propertyDetailRepository, never()).findById(anyString());
        verify(lockedPropertyRepository, never()).findLockedProperty(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).delete(any());
    }

    @Test
    void handleCommand_shouldThrowInvalidInputDataExceptionWhenStartDateEqualsEndDate() {
        // Given
        LocalDate date = LocalDate.of(2024, 1, 1);
        String propertyId = "property-123";
        UnlockPropertyCommand command = new UnlockPropertyCommand(date, date, propertyId);

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("start date cannot be greater or equals to end date");

        verify(propertyDetailRepository, never()).findById(anyString());
        verify(lockedPropertyRepository, never()).findLockedProperty(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).delete(any());
    }

    @Test
    void handleCommand_shouldThrowInvalidInputDataExceptionWhenPropertyDetailIdIsBlank() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String propertyId = "";
        UnlockPropertyCommand command = new UnlockPropertyCommand(startDate, endDate, propertyId);

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("property detail id cannot be empty");

        verify(propertyDetailRepository, never()).findById(anyString());
        verify(lockedPropertyRepository, never()).findLockedProperty(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).delete(any());
    }

    @Test
    void handleCommand_shouldThrowInvalidInputDataExceptionWhenStartDateIsNull() {
        // Given
        LocalDate startDate = null;
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String propertyId = "property-123";
        UnlockPropertyCommand command = new UnlockPropertyCommand(startDate, endDate, propertyId);

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("start date cannot be null");

        verify(propertyDetailRepository, never()).findById(anyString());
        verify(lockedPropertyRepository, never()).findLockedProperty(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).delete(any());
    }

    @Test
    void handleCommand_shouldThrowInvalidInputDataExceptionWhenEndDateIsNull() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = null;
        String propertyId = "property-123";
        UnlockPropertyCommand command = new UnlockPropertyCommand(startDate, endDate, propertyId);

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("end date cannot be null");

        verify(propertyDetailRepository, never()).findById(anyString());
        verify(lockedPropertyRepository, never()).findLockedProperty(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).delete(any());
    }

    @Test
    void handleCommand_shouldCallDeleteWithCorrectLockedPropertyEntity() {
        // Given
        String propertyId = "property-456";
        LocalDate startDate = LocalDate.of(2024, 2, 1);
        LocalDate endDate = LocalDate.of(2024, 2, 15);
        UnlockPropertyCommand command = new UnlockPropertyCommand(startDate, endDate, propertyId);

        PropertyDetailEntity propertyEntity = createPropertyDetailEntity(propertyId);
        LockedPropertyEntity lockedPropertyEntity = createLockedPropertyEntity(propertyId, startDate, endDate, propertyEntity);

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.of(propertyEntity));
        when(lockedPropertyRepository.findLockedProperty(startDate, endDate, propertyId)).thenReturn(Optional.of(lockedPropertyEntity));

        // When
        handler.handleCommand(command);

        // Then
        verify(lockedPropertyRepository).delete(lockedPropertyEntity);
    }

    private PropertyDetailEntity createPropertyDetailEntity(String id) {
        PropertyDetailEntity entity = new PropertyDetailEntity();
        entity.setId(id);
        entity.setName("Test Property");
        return entity;
    }

    private LockedPropertyEntity createLockedPropertyEntity(String propertyId, LocalDate startDate, LocalDate endDate, PropertyDetailEntity propertyEntity) {
        LockedPropertyEntity entity = new LockedPropertyEntity();
        entity.setIdLocked(UUID.randomUUID().toString());
        entity.setActive(true);
        entity.setStartDate(startDate);
        entity.setEndDate(endDate);
        entity.setPropertyDetail(propertyEntity);
        return entity;
    }
}

