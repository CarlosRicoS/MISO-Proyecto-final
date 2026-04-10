package co.edu.uniandes.grupo03.proyectofinal.pocproperties.contract.rest.controller;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.CommandHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.propertydetail.LockPropertyCommand;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.ResourceAlreadyExistsException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.ResourceNotFoundException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.PageableQueryHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.QueryHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

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
class PropertyControllerTest {

    @Mock
    private PageableQueryHandler<SearchPropertiesQuery, SearchPropertiesQueryResponse> searchPropertiesQueryHandler;

    @Mock
    private QueryHandler<SearchPropertyByIdQuery, SearchPropertyByIdQueryResponse> searchPropertyByIdQueryHandler;

    @Mock
    private CommandHandler<LockPropertyCommand, EmptyCommandResponse> lockPropertyCommandHandler;

    private PropertyController controller;

    @BeforeEach
    void setUp() {
        controller = new PropertyController(
                searchPropertiesQueryHandler,
                searchPropertyByIdQueryHandler,
                lockPropertyCommandHandler
        );
    }

    @Test
    void searchProperties_shouldRouteToSearchPropertiesHandlerWhenQueryHasFilters() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, endDate, "Bogota", 4);
        Pageable pageable = PageRequest.of(0, 10);

        SearchPropertiesQueryResponse.PropertyResult result1 = createPropertyResult("3", "Hotel C");
        SearchPropertiesQueryResponse response = new SearchPropertiesQueryResponse(List.of(result1));

        when(searchPropertiesQueryHandler.execute(eq(query), eq(pageable))).thenReturn(response);

        // When
        ResponseEntity<List<SearchPropertiesQueryResponse.PropertyResult>> responseEntity = 
                controller.searchProperties(query, pageable);

        // Then
        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(responseEntity.getBody()).hasSize(1);
        assertThat(responseEntity.getBody()).containsExactly(result1);

        verify(searchPropertiesQueryHandler).execute(eq(query), eq(pageable));
    }

    @Test
    void searchPropertyById_shouldReturnPropertyDetails() {
        // Given
        String propertyId = "property-123";

        SearchPropertyByIdQueryResponse.ReviewDto review = new SearchPropertyByIdQueryResponse.ReviewDto(
                "review-1", "Great!", 5, "John"
        );
        SearchPropertyByIdQueryResponse.AmenityDto amenity = new SearchPropertyByIdQueryResponse.AmenityDto(
                "amenity-1", "WiFi"
        );

        SearchPropertyByIdQueryResponse response = new SearchPropertyByIdQueryResponse(
                propertyId,
                "Luxury Hotel",
                "Bogota",
                4,
                "Amazing property",
                List.of("https://example.com/photo.jpg"),
                LocalTime.of(14, 0),
                LocalTime.of(11, 0),
                "admin-group-1",
                List.of(review),
                List.of(amenity)
        );

        when(searchPropertyByIdQueryHandler.execute(any(SearchPropertyByIdQuery.class))).thenReturn(response);

        // When
        ResponseEntity<SearchPropertyByIdQueryResponse> responseEntity = controller.searchPropertyById(propertyId);

        // Then
        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(responseEntity.getBody()).isNotNull();
        assertThat(responseEntity.getBody().getId()).isEqualTo(propertyId);
        assertThat(responseEntity.getBody().getName()).isEqualTo("Luxury Hotel");
        assertThat(responseEntity.getBody().getReviews()).hasSize(1);
        assertThat(responseEntity.getBody().getAmenities()).hasSize(1);

        verify(searchPropertyByIdQueryHandler).execute(any(SearchPropertyByIdQuery.class));
    }

    @Test
    void searchPropertyById_shouldThrowResourceNotFoundExceptionWhenPropertyDoesNotExist() {
        // Given
        String propertyId = "non-existent-id";

        when(searchPropertyByIdQueryHandler.execute(any(SearchPropertyByIdQuery.class)))
                .thenThrow(new ResourceNotFoundException("The property with id " + propertyId + " could not be found."));

        // When / Then
        assertThatThrownBy(() -> controller.searchPropertyById(propertyId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("The property with id " + propertyId + " could not be found");

        verify(searchPropertyByIdQueryHandler).execute(any(SearchPropertyByIdQuery.class));
    }

    @Test
    void lockProperty_shouldReturnNoContentOnSuccess() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String propertyId = "property-123";
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        when(lockPropertyCommandHandler.handle(command)).thenReturn(EmptyCommandResponse.VALUE);

        // When
        ResponseEntity<Void> responseEntity = controller.lockProperty(command);

        // Then
        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(responseEntity.getBody()).isNull();

        verify(lockPropertyCommandHandler).handle(command);
    }

    @Test
    void lockProperty_shouldThrowResourceNotFoundExceptionWhenPropertyDoesNotExist() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String propertyId = "non-existent-id";
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        when(lockPropertyCommandHandler.handle(command))
                .thenThrow(new ResourceNotFoundException("The property detail with the id " + propertyId + " does not exist."));

        // When / Then
        assertThatThrownBy(() -> controller.lockProperty(command))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("The property detail with the id " + propertyId + " does not exist");

        verify(lockPropertyCommandHandler).handle(command);
    }

    @Test
    void lockProperty_shouldThrowResourceAlreadyExistsExceptionWhenDateConflictExists() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        String propertyId = "property-123";
        LockPropertyCommand command = new LockPropertyCommand(startDate, endDate, propertyId);

        when(lockPropertyCommandHandler.handle(command))
                .thenThrow(new ResourceAlreadyExistsException("There are already 1 locked properties with the given dates."));

        // When / Then
        assertThatThrownBy(() -> controller.lockProperty(command))
                .isInstanceOf(ResourceAlreadyExistsException.class)
                .hasMessageContaining("There are already 1 locked properties with the given dates");

        verify(lockPropertyCommandHandler).handle(command);
    }

    @Test
    void searchProperties_shouldHandlePaginationCorrectly() {
        // Given
        LocalDate startDate = LocalDate.of(2024, 1, 1);
        LocalDate endDate = LocalDate.of(2024, 1, 10);
        SearchPropertiesQuery query = new SearchPropertiesQuery(startDate, endDate, "Medellin", 2);
        Pageable pageable = PageRequest.of(1, 5);

        SearchPropertiesQueryResponse.PropertyResult result1 = createPropertyResult("6", "Hotel F");
        SearchPropertiesQueryResponse response = new SearchPropertiesQueryResponse(List.of(result1));

        when(searchPropertiesQueryHandler.execute(eq(query), eq(pageable))).thenReturn(response);

        // When
        ResponseEntity<List<SearchPropertiesQueryResponse.PropertyResult>> responseEntity = 
                controller.searchProperties(query, pageable);

        // Then
        assertThat(responseEntity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(responseEntity.getBody()).hasSize(1);

        verify(searchPropertiesQueryHandler).execute(eq(query), eq(pageable));
    }

    @Test
    void searchPropertyById_shouldCreateQueryWithCorrectId() {
        // Given
        String propertyId = "specific-property-id-789";

        SearchPropertyByIdQueryResponse response = new SearchPropertyByIdQueryResponse(
                propertyId,
                "Test Property",
                "Bogota",
                2,
                "Description",
                List.of("https://example.com/photo.jpg"),
                LocalTime.of(15, 0),
                LocalTime.of(10, 0),
                "admin-group-2",
                Collections.emptyList(),
                Collections.emptyList()
        );

        when(searchPropertyByIdQueryHandler.execute(any(SearchPropertyByIdQuery.class))).thenReturn(response);

        // When
        controller.searchPropertyById(propertyId);

        // Then
        verify(searchPropertyByIdQueryHandler).execute(argThat(query -> 
                query.getId().equals(propertyId)
        ));
    }

    private SearchPropertiesQueryResponse.PropertyResult createPropertyResult(String id, String name) {
        return new SearchPropertiesQueryResponse.PropertyResult(
                id,
                name,
                "Bogota",
                4,
                "Test property description",
                List.of("https://example.com/photo.jpg"),
                LocalTime.of(14, 0),
                LocalTime.of(11, 0),
                "admin-group-1"
        );
    }
}
