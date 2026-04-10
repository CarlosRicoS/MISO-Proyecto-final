package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.InvalidInputDataException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.ResourceNotFoundException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.mapper.PropertyDetailMapper;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.entity.PropertyDetailEntity;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.PropertyDetailRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchPropertyByIdQueryHandlerTest {

    @Mock
    private PropertyDetailRepository propertyDetailRepository;

    @Mock
    private PropertyDetailMapper propertyDetailMapper;

    private Validator validator;

    private SearchPropertyByIdQueryHandler handler;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
        handler = new SearchPropertyByIdQueryHandler(validator, propertyDetailRepository, propertyDetailMapper);
    }

    @Test
    void executeQuery_shouldReturnPropertyWithReviewsAndAmenities() {
        // Given
        String propertyId = "property-123";
        SearchPropertyByIdQuery query = new SearchPropertyByIdQuery(propertyId);

        PropertyDetailEntity entity = createPropertyDetailEntity(propertyId, "Luxury Hotel");

        SearchPropertyByIdQueryResponse.ReviewDto review1 = new SearchPropertyByIdQueryResponse.ReviewDto(
                "review-1", "Great place!", 5, "John Doe"
        );
        SearchPropertyByIdQueryResponse.ReviewDto review2 = new SearchPropertyByIdQueryResponse.ReviewDto(
                "review-2", "Nice location", 4, "Jane Smith"
        );

        SearchPropertyByIdQueryResponse.AmenityDto amenity1 = new SearchPropertyByIdQueryResponse.AmenityDto(
                "amenity-1", "WiFi"
        );
        SearchPropertyByIdQueryResponse.AmenityDto amenity2 = new SearchPropertyByIdQueryResponse.AmenityDto(
                "amenity-2", "Pool"
        );

        SearchPropertyByIdQueryResponse expectedResponse = new SearchPropertyByIdQueryResponse(
                propertyId,
                "Luxury Hotel",
                "Bogota",
                4,
                "Test property description",
                List.of("https://example.com/photo.jpg"),
                LocalTime.of(14, 0),
                LocalTime.of(11, 0),
                "admin-group-1",
                List.of(review1, review2),
                List.of(amenity1, amenity2)
        );

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.of(entity));
        when(propertyDetailMapper.toSearchByIdResponse(entity)).thenReturn(expectedResponse);

        // When
        SearchPropertyByIdQueryResponse response = handler.execute(query);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(propertyId);
        assertThat(response.getName()).isEqualTo("Luxury Hotel");
        assertThat(response.getReviews()).hasSize(2);
        assertThat(response.getAmenities()).hasSize(2);

        verify(propertyDetailRepository).findById(propertyId);
        verify(propertyDetailMapper).toSearchByIdResponse(entity);
    }

    @Test
    void executeQuery_shouldThrowResourceNotFoundExceptionWhenPropertyDoesNotExist() {
        // Given
        String propertyId = "non-existent-id";
        SearchPropertyByIdQuery query = new SearchPropertyByIdQuery(propertyId);

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> handler.execute(query))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("The property with id " + propertyId + " could not be found");

        verify(propertyDetailRepository).findById(propertyId);
        verify(propertyDetailMapper, never()).toSearchByIdResponse(any());
    }

    @Test
    void executeQuery_shouldThrowInvalidInputDataExceptionWhenIdIsBlank() {
        // Given
        String propertyId = "";
        SearchPropertyByIdQuery query = new SearchPropertyByIdQuery(propertyId);

        // When / Then
        assertThatThrownBy(() -> handler.execute(query))
                .isInstanceOf(InvalidInputDataException.class)
                .hasMessageContaining("id is required");

        verify(propertyDetailRepository, never()).findById(anyString());
        verify(propertyDetailMapper, never()).toSearchByIdResponse(any());
    }

    @Test
    void executeQuery_shouldReturnPropertyWithEmptyReviewsAndAmenities() {
        // Given
        String propertyId = "property-456";
        SearchPropertyByIdQuery query = new SearchPropertyByIdQuery(propertyId);

        PropertyDetailEntity entity = createPropertyDetailEntity(propertyId, "Basic Hotel");

        SearchPropertyByIdQueryResponse expectedResponse = new SearchPropertyByIdQueryResponse(
                propertyId,
                "Basic Hotel",
                "Bogota",
                2,
                "Simple property",
                List.of("https://example.com/basic.jpg"),
                LocalTime.of(15, 0),
                LocalTime.of(10, 0),
                "admin-group-2",
                Collections.emptyList(),
                Collections.emptyList()
        );

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.of(entity));
        when(propertyDetailMapper.toSearchByIdResponse(entity)).thenReturn(expectedResponse);

        // When
        SearchPropertyByIdQueryResponse response = handler.execute(query);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(propertyId);
        assertThat(response.getReviews()).isEmpty();
        assertThat(response.getAmenities()).isEmpty();

        verify(propertyDetailRepository).findById(propertyId);
        verify(propertyDetailMapper).toSearchByIdResponse(entity);
    }

    @Test
    void executeQuery_shouldMapAllPropertyFieldsCorrectly() {
        // Given
        String propertyId = "property-789";
        SearchPropertyByIdQuery query = new SearchPropertyByIdQuery(propertyId);

        PropertyDetailEntity entity = createPropertyDetailEntity(propertyId, "Complete Hotel");

        SearchPropertyByIdQueryResponse expectedResponse = new SearchPropertyByIdQueryResponse(
                propertyId,
                "Complete Hotel",
                "Bogota",
                8,
                "Full description here",
                List.of("https://example.com/complete.jpg"),
                LocalTime.of(16, 30),
                LocalTime.of(12, 0),
                "admin-group-3",
                Collections.emptyList(),
                Collections.emptyList()
        );

        when(propertyDetailRepository.findById(propertyId)).thenReturn(Optional.of(entity));
        when(propertyDetailMapper.toSearchByIdResponse(entity)).thenReturn(expectedResponse);

        // When
        SearchPropertyByIdQueryResponse response = handler.execute(query);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(propertyId);
        assertThat(response.getName()).isEqualTo("Complete Hotel");
        assertThat(response.getMaxCapacity()).isEqualTo(8);
        assertThat(response.getDescription()).isEqualTo("Full description here");
        assertThat(response.getPhotos()).contains("https://example.com/complete.jpg");
        assertThat(response.getCheckInTime()).isEqualTo(LocalTime.of(16, 30));
        assertThat(response.getCheckOutTime()).isEqualTo(LocalTime.of(12, 0));
        assertThat(response.getAdminGroupId()).isEqualTo("admin-group-3");

        verify(propertyDetailRepository).findById(propertyId);
        verify(propertyDetailMapper).toSearchByIdResponse(entity);
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
}
