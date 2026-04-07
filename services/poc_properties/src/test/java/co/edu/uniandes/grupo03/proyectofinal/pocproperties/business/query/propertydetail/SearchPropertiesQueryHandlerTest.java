package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.InvalidInputDataException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.mapper.PropertyDetailMapper;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.PropertyDetailEntity;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.PropertyDetailRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchPropertiesQueryHandlerTest {

    @Mock
    private PropertyDetailRepository propertyDetailRepository;

    @Mock
    private PropertyDetailMapper propertyDetailMapper;

    private Validator validator;

    private SearchPropertiesQueryHandler handler;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
        handler = new SearchPropertiesQueryHandler(validator, propertyDetailRepository, propertyDetailMapper);
    }

    @Test
    void executeQuery_shouldReturnFilteredPaginatedResults() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String city = "Bogota";
        Integer capacity = 4;
        Pageable pageable = PageRequest.of(0, 10);

        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, endDate, city, capacity);

        PropertyDetailEntity entity1 = createPropertyDetailEntity("1", "Hotel A");
        PropertyDetailEntity entity2 = createPropertyDetailEntity("2", "Hotel B");
        Page<PropertyDetailEntity> page = new PageImpl<>(List.of(entity1, entity2), pageable, 2);

        SearchPropertiesQueryResponse.PropertyResult result1 = createPropertyResult("1", "Hotel A");
        SearchPropertiesQueryResponse.PropertyResult result2 = createPropertyResult("2", "Hotel B");

        when(propertyDetailRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
        when(propertyDetailMapper.toPropertyResult(entity1)).thenReturn(result1);
        when(propertyDetailMapper.toPropertyResult(entity2)).thenReturn(result2);

        // When
        SearchPropertiesQueryResponse response = handler.execute(query, pageable);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).hasSize(2);
        assertThat(response.getResult()).containsExactly(result1, result2);

        verify(propertyDetailRepository).findAll(any(Specification.class), eq(pageable));
        verify(propertyDetailMapper, times(2)).toPropertyResult(any(PropertyDetailEntity.class));
    }

    @Test
    void executeQuery_shouldThrowExceptionWhenStartDateIsAfterEndDate() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 10);
        LocalDate endDate = LocalDate.of(2024, 1, 1);
        String city = "Bogota";
        Integer capacity = 4;
        Pageable pageable = PageRequest.of(0, 10);

        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, endDate, city, capacity);

        // When / Then
        assertThatThrownBy(() -> handler.execute(query, pageable))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("The start date cannot be greater than end date.");
    }

    @Test
    void executeQuery_shouldThrowExceptionWhenCityIsBlank() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String city = "";
        Integer capacity = 4;
        Pageable pageable = PageRequest.of(0, 10);

        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, endDate, city, capacity);

        // When / Then
        assertThatThrownBy(() -> handler.execute(query, pageable))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("city is required");
    }

    @Test
    void executeQuery_shouldThrowExceptionWhenCapacityIsNull() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String city = "Bogota";
        Integer capacity = null;
        Pageable pageable = PageRequest.of(0, 10);

        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, endDate, city, capacity);

        // When / Then
        assertThatThrownBy(() -> handler.execute(query, pageable))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("capacity is required");
    }

    @Test
    void executeQuery_shouldThrowExceptionWhenCapacityIsNegative() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String city = "Bogota";
        Integer capacity = -1;
        Pageable pageable = PageRequest.of(0, 10);

        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, endDate, city, capacity);

        // When / Then
        assertThatThrownBy(() -> handler.execute(query, pageable))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("capacity must be a positive value");
    }

    @Test
    void executeQuery_shouldReturnEmptyListWhenNoMatchingProperties() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String city = "Bogota";
        Integer capacity = 4;
        Pageable pageable = PageRequest.of(0, 10);

        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, endDate, city, capacity);

        Page<PropertyDetailEntity> emptyPage = new PageImpl<>(Collections.emptyList(), pageable, 0);

        when(propertyDetailRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(emptyPage);

        // When
        SearchPropertiesQueryResponse response = handler.execute(query, pageable);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).isEmpty();

        verify(propertyDetailRepository).findAll(any(Specification.class), eq(pageable));
        verify(propertyDetailMapper, never()).toPropertyResult(any());
    }

    @Test
    void executeQuery_shouldRespectPageSizeAndPageNumber() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String city = "Bogota";
        Integer capacity = 4;
        Pageable pageable = PageRequest.of(1, 5); // Page 1, size 5

        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, endDate, city, capacity);

        PropertyDetailEntity entity1 = createPropertyDetailEntity("6", "Hotel F");
        PropertyDetailEntity entity2 = createPropertyDetailEntity("7", "Hotel G");
        Page<PropertyDetailEntity> page = new PageImpl<>(List.of(entity1, entity2), pageable, 7);

        SearchPropertiesQueryResponse.PropertyResult result1 = createPropertyResult("6", "Hotel F");
        SearchPropertiesQueryResponse.PropertyResult result2 = createPropertyResult("7", "Hotel G");

        when(propertyDetailRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
        when(propertyDetailMapper.toPropertyResult(entity1)).thenReturn(result1);
        when(propertyDetailMapper.toPropertyResult(entity2)).thenReturn(result2);

        // When
        SearchPropertiesQueryResponse response = handler.executeQuery(query, pageable);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).hasSize(2);
        assertThat(response.getResult()).containsExactly(result1, result2);

        verify(propertyDetailRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    void executeQuery_shouldThrowExceptionWhenStartDateIsNull() {
        // Given
        LocalDate startDate = null;
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String city = "Bogota";
        Integer capacity = 4;
        Pageable pageable = PageRequest.of(0, 10);

        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, endDate, city, capacity);

        // When / Then
        assertThatThrownBy(() -> handler.execute(query, pageable))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("The start date is required.");
    }

    @Test
    void executeQuery_shouldThrowExceptionWhenEndDateIsNull() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = null;
        String city = "Bogota";
        Integer capacity = 4;
        Pageable pageable = PageRequest.of(0, 10);

        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, endDate, city, capacity);

        // When / Then
        assertThatThrownBy(() -> handler.execute(query, pageable))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("The end date is required.");
    }

    private PropertyDetailEntity createPropertyDetailEntity(String id, String name) {
        PropertyDetailEntity entity = new PropertyDetailEntity();
        entity.setId(id);
        entity.setName(name);
        entity.setMaxCapacity(4);
        entity.setDescription("Test property description");
        entity.setPhotos(List.of("https://example.com/photo.jpg"));
        entity.setCheckInTime(LocalTime.of(14, 0));
        entity.setCheckOutTime(LocalTime.of(11, 0));
        entity.setAdminGroupId("admin-group-1");
        return entity;
    }

    private SearchPropertiesQueryResponse.PropertyResult createPropertyResult(String id, String name) {
        return new SearchPropertiesQueryResponse.PropertyResult(
                id,
                name,
                4,
                "Test property description",
                List.of("https://example.com/photo.jpg"),
                LocalTime.of(14, 0),
                LocalTime.of(11, 0),
                "admin-group-1"
        );
    }

    @Test
    void executeQuery_shouldReturnAllPropertiesWhenNoFiltersProvided() {
        // Given
        Pageable pageable = PageRequest.of(0, 10);
        SearchPropertiesQuery query = new SearchPropertiesQuery(null, null, null, null);

        PropertyDetailEntity entity1 = createPropertyDetailEntity("1", "Property A");
        PropertyDetailEntity entity2 = createPropertyDetailEntity("2", "Property B");
        PropertyDetailEntity entity3 = createPropertyDetailEntity("3", "Property C");
        Page<PropertyDetailEntity> page = new PageImpl<>(List.of(entity1, entity2, entity3), pageable, 3);

        SearchPropertiesQueryResponse.PropertyResult result1 = createPropertyResult("1", "Property A");
        SearchPropertiesQueryResponse.PropertyResult result2 = createPropertyResult("2", "Property B");
        SearchPropertiesQueryResponse.PropertyResult result3 = createPropertyResult("3", "Property C");

        when(propertyDetailRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
        when(propertyDetailMapper.toPropertyResult(entity1)).thenReturn(result1);
        when(propertyDetailMapper.toPropertyResult(entity2)).thenReturn(result2);
        when(propertyDetailMapper.toPropertyResult(entity3)).thenReturn(result3);

        // When
        SearchPropertiesQueryResponse response = handler.execute(query, pageable);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).hasSize(3);
        assertThat(response.getResult()).containsExactly(result1, result2, result3);

        verify(propertyDetailRepository).findAll(any(Specification.class), eq(pageable));
        verify(propertyDetailMapper, times(3)).toPropertyResult(any(PropertyDetailEntity.class));
    }

    @Test
    void executeQuery_shouldFilterByCityWhenOnlyCityProvided() {
        // Given
        String city = "Medellin";
        Pageable pageable = PageRequest.of(0, 10);
        SearchPropertiesQuery query = new SearchPropertiesQuery(null, null, city, null);

        PropertyDetailEntity entity1 = createPropertyDetailEntity("1", "Hotel Medellin A");
        PropertyDetailEntity entity2 = createPropertyDetailEntity("2", "Hotel Medellin B");
        Page<PropertyDetailEntity> page = new PageImpl<>(List.of(entity1, entity2), pageable, 2);

        SearchPropertiesQueryResponse.PropertyResult result1 = createPropertyResult("1", "Hotel Medellin A");
        SearchPropertiesQueryResponse.PropertyResult result2 = createPropertyResult("2", "Hotel Medellin B");

        when(propertyDetailRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
        when(propertyDetailMapper.toPropertyResult(entity1)).thenReturn(result1);
        when(propertyDetailMapper.toPropertyResult(entity2)).thenReturn(result2);

        // When
        SearchPropertiesQueryResponse response = handler.execute(query, pageable);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).hasSize(2);
        assertThat(response.getResult()).containsExactly(result1, result2);

        verify(propertyDetailRepository).findAll(any(Specification.class), eq(pageable));
        verify(propertyDetailMapper, times(2)).toPropertyResult(any(PropertyDetailEntity.class));
    }

    @Test
    void executeQuery_shouldFilterByCapacityWhenOnlyCapacityProvided() {
        // Given
        Integer capacity = 6;
        Pageable pageable = PageRequest.of(0, 10);
        SearchPropertiesQuery query = new SearchPropertiesQuery(null, null, null, capacity);

        PropertyDetailEntity entity1 = createPropertyDetailEntity("1", "Large Property A");
        PropertyDetailEntity entity2 = createPropertyDetailEntity("2", "Large Property B");
        Page<PropertyDetailEntity> page = new PageImpl<>(List.of(entity1, entity2), pageable, 2);

        SearchPropertiesQueryResponse.PropertyResult result1 = createPropertyResult("1", "Large Property A");
        SearchPropertiesQueryResponse.PropertyResult result2 = createPropertyResult("2", "Large Property B");

        when(propertyDetailRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
        when(propertyDetailMapper.toPropertyResult(entity1)).thenReturn(result1);
        when(propertyDetailMapper.toPropertyResult(entity2)).thenReturn(result2);

        // When
        SearchPropertiesQueryResponse response = handler.execute(query, pageable);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).hasSize(2);
        assertThat(response.getResult()).containsExactly(result1, result2);

        verify(propertyDetailRepository).findAll(any(Specification.class), eq(pageable));
        verify(propertyDetailMapper, times(2)).toPropertyResult(any(PropertyDetailEntity.class));
    }

    @Test
    void executeQuery_shouldFilterByStartDateWhenOnlyStartDateProvided() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 6, 15);
        Pageable pageable = PageRequest.of(0, 10);
        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, null, null, null);

        PropertyDetailEntity entity1 = createPropertyDetailEntity("1", "Available Property A");
        PropertyDetailEntity entity2 = createPropertyDetailEntity("2", "Available Property B");
        PropertyDetailEntity entity3 = createPropertyDetailEntity("3", "Available Property C");
        Page<PropertyDetailEntity> page = new PageImpl<>(List.of(entity1, entity2, entity3), pageable, 3);

        SearchPropertiesQueryResponse.PropertyResult result1 = createPropertyResult("1", "Available Property A");
        SearchPropertiesQueryResponse.PropertyResult result2 = createPropertyResult("2", "Available Property B");
        SearchPropertiesQueryResponse.PropertyResult result3 = createPropertyResult("3", "Available Property C");

        when(propertyDetailRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
        when(propertyDetailMapper.toPropertyResult(entity1)).thenReturn(result1);
        when(propertyDetailMapper.toPropertyResult(entity2)).thenReturn(result2);
        when(propertyDetailMapper.toPropertyResult(entity3)).thenReturn(result3);

        // When
        SearchPropertiesQueryResponse response = handler.execute(query, pageable);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).hasSize(3);
        assertThat(response.getResult()).containsExactly(result1, result2, result3);

        verify(propertyDetailRepository).findAll(any(Specification.class), eq(pageable));
        verify(propertyDetailMapper, times(3)).toPropertyResult(any(PropertyDetailEntity.class));
    }
}
