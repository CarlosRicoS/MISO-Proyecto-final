package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.InvalidInputDataException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.ResourceAlreadyExistsException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.ResourceNotFoundException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.LockedPropertyEntity;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.PropertyDetailEntity;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.LockedPropertyRepository;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.PropertyDetailRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LockPropertyCommandHandlerTest {

    @Mock
    private LockedPropertyRepository lockedPropertyRepository;

    @Mock
    private PropertyDetailRepository propertyDetailRepository;

    private Validator validator;

    private LockPropertyCommandHandler handler;

    @BeforeEach
    void setUp() {

        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
        handler = new LockPropertyCommandHandler(validator, lockedPropertyRepository, propertyDetailRepository);
    }

    @Test
    void handleCommand_shouldLockPropertySuccessfully() {
        // Given
        String propertyId = "property-123";
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        PropertyDetailEntity propertyEntity = createPropertyDetailEntity(propertyId);

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.of(propertyEntity));
        when(lockedPropertyRepository.countLockedProperties(startDate, endDate, propertyId)).thenReturn(0L);
        when(lockedPropertyRepository.save(any(LockedPropertyEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        EmptyCommandResponse response = handler.handleCommand(command);

        // Then
        assertThat(response).isNotNull();
        assertThat(response).isEqualTo(EmptyCommandResponse.VALUE);

        verify(propertyDetailRepository).findById(propertyId);
        verify(lockedPropertyRepository).countLockedProperties(startDate, endDate, propertyId);

        ArgumentCaptor<LockedPropertyEntity> captor = ArgumentCaptor.forClass(LockedPropertyEntity.class);
        verify(lockedPropertyRepository).save(captor.capture());

        LockedPropertyEntity savedEntity = captor.getValue();
        assertThat(savedEntity.getIdLocked()).isNotNull();
        assertThat(savedEntity.isActive()).isTrue();
        assertThat(savedEntity.getStartDate()).isEqualTo(startDate);
        assertThat(savedEntity.getEndDate()).isEqualTo(endDate);
        assertThat(savedEntity.getPropertyDetail()).isEqualTo(propertyEntity);
    }

    @Test
    void handleCommand_shouldThrowResourceNotFoundExceptionWhenPropertyDoesNotExist() {
        // Given
        String propertyId = "non-existent-id";
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> handler.handleCommand(command))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("The property detail with the id " + propertyId + " does not exist");

        verify(propertyDetailRepository).findById(propertyId);
        verify(lockedPropertyRepository, never()).countLockedProperties(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).save(any());
    }

    @Test
    void handleCommand_shouldThrowResourceAlreadyExistsExceptionWhenDateConflictExists() {
        // Given
        String propertyId = "property-123";
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        PropertyDetailEntity propertyEntity = createPropertyDetailEntity(propertyId);

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.of(propertyEntity));
        when(lockedPropertyRepository.countLockedProperties(startDate, endDate, propertyId)).thenReturn(2L);

        // When / Then
        assertThatThrownBy(() -> handler.handleCommand(command))
                .isInstanceOf(ResourceAlreadyExistsException.class)
                .hasMessageContaining("There are already 2 locked properties with the given dates");

        verify(propertyDetailRepository).findById(propertyId);
        verify(lockedPropertyRepository).countLockedProperties(startDate, endDate, propertyId);
        verify(lockedPropertyRepository, never()).save(any());
    }

    @Test
    void handleCommand_shouldThrowInvalidInputDataExceptionWhenStartDateIsAfterEndDate() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 10);
        LocalDate endDate = LocalDate.of(2024, 1, 1);
        String propertyId = "property-123";
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("start date cannot be greater or equals to end date");

        verify(propertyDetailRepository, never()).findById(anyString());
        verify(lockedPropertyRepository, never()).countLockedProperties(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).save(any());
    }

    @Test
    void handleCommand_shouldThrowInvalidInputDataExceptionWhenStartDateEqualsEndDate() {
        // Given
        LocalDate date = LocalDate.of(2024, 1, 1);
        String propertyId = "property-123";
        LockPropertyCommand command = new LockPropertyCommand(date, date, propertyId);

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("start date cannot be greater or equals to end date");

        verify(propertyDetailRepository, never()).findById(anyString());
        verify(lockedPropertyRepository, never()).countLockedProperties(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).save(any());
    }

    @Test
    void handleCommand_shouldThrowInvalidInputDataExceptionWhenPropertyDetailIdIsBlank() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String propertyId = "";
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("property detail id cannot be empty");

        verify(propertyDetailRepository, never()).findById(anyString());
        verify(lockedPropertyRepository, never()).countLockedProperties(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).save(any());
    }

    @Test
    void handleCommand_shouldThrowInvalidInputDataExceptionWhenStartDateIsNull() {
        // Given
        LocalDate startDate = null;
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String propertyId = "property-123";
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("start date cannot be null");

        verify(propertyDetailRepository, never()).findById(anyString());
        verify(lockedPropertyRepository, never()).countLockedProperties(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).save(any());
    }

    @Test
    void handleCommand_shouldThrowInvalidInputDataExceptionWhenEndDateIsNull() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = null;
        String propertyId = "property-123";
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        // When / Then
        assertThatThrownBy(() -> handler.handle(command))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("end date cannot be null");

        verify(propertyDetailRepository, never()).findById(anyString());
        verify(lockedPropertyRepository, never()).countLockedProperties(any(), any(), anyString());
        verify(lockedPropertyRepository, never()).save(any());
    }

    @Test
    void handleCommand_shouldGenerateUuidForLockedProperty() {
        // Given
        String propertyId = "property-456";
        LocalDate startDate = LocalDate.of(2024, 2, 1);
        LocalDate endDate = LocalDate.of(2024, 2, 15);
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        PropertyDetailEntity propertyEntity = createPropertyDetailEntity(propertyId);

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.of(propertyEntity));
        when(lockedPropertyRepository.countLockedProperties(startDate, endDate, propertyId)).thenReturn(0L);
        when(lockedPropertyRepository.save(any(LockedPropertyEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        handler.handleCommand(command);

        // Then
        ArgumentCaptor<LockedPropertyEntity> captor = ArgumentCaptor.forClass(LockedPropertyEntity.class);
        verify(lockedPropertyRepository).save(captor.capture());

        LockedPropertyEntity savedEntity = captor.getValue();
        assertThat(savedEntity.getIdLocked()).isNotNull();
        assertThat(savedEntity.getIdLocked()).matches("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    }

    @Test
    void handleCommand_shouldSetActiveFlagToTrue() {
        // Given
        String propertyId = "property-789";
        LocalDate startDate = LocalDate.of(2024, 3, 1);
        LocalDate endDate = LocalDate.of(2024, 3, 31);
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        PropertyDetailEntity propertyEntity = createPropertyDetailEntity(propertyId);

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.of(propertyEntity));
        when(lockedPropertyRepository.countLockedProperties(startDate, endDate, propertyId)).thenReturn(0L);
        when(lockedPropertyRepository.save(any(LockedPropertyEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        handler.handleCommand(command);

        // Then
        ArgumentCaptor<LockedPropertyEntity> captor = ArgumentCaptor.forClass(LockedPropertyEntity.class);
        verify(lockedPropertyRepository).save(captor.capture());

        LockedPropertyEntity savedEntity = captor.getValue();
        assertThat(savedEntity.isActive()).isTrue();
    }

    private PropertyDetailEntity createPropertyDetailEntity(String id) {
        PropertyDetailEntity entity = new PropertyDetailEntity();
        entity.setId(id);
        entity.setName("Test Property");
        return entity;
    }
}
