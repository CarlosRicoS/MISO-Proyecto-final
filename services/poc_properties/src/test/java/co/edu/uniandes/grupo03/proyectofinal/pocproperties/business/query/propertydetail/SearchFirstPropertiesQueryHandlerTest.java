package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

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
import org.springframework.data.domain.Pageable;

import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SearchFirstPropertiesQueryHandlerTest {

    @Mock
    private PropertyDetailRepository propertyDetailRepository;

    @Mock
    private PropertyDetailMapper propertyDetailMapper;

    private Validator validator;

    private SearchFirstPropertiesQueryHandler handler;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
        handler = new SearchFirstPropertiesQueryHandler(validator, propertyDetailRepository, propertyDetailMapper);
    }

    @Test
    void executeQuery_shouldReturnAllPropertiesMappedCorrectly() {
        // Given
        PropertyDetailEntity entity1 = createPropertyDetailEntity("1", "Hotel A");
        PropertyDetailEntity entity2 = createPropertyDetailEntity("2", "Hotel B");
        List<PropertyDetailEntity> propertiesToReturn = List.of(entity1, entity2);

        SearchPropertiesQueryResponse.PropertyResult result1 = createPropertyResult("1", "Hotel A");
        SearchPropertiesQueryResponse.PropertyResult result2 = createPropertyResult("2", "Hotel B");

        when(propertyDetailRepository.findAllBy(any(Pageable.class))).thenReturn(propertiesToReturn);
        when(propertyDetailMapper.toPropertyResult(entity1)).thenReturn(result1);
        when(propertyDetailMapper.toPropertyResult(entity2)).thenReturn(result2);

        SearchFirstPropertiesQuery query = new SearchFirstPropertiesQuery();

        // When
        SearchPropertiesQueryResponse response = handler.execute(query);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).hasSize(2);
        assertThat(response.getResult()).containsExactly(result1, result2);

        verify(propertyDetailRepository).findAllBy(any(Pageable.class));
        verify(propertyDetailMapper, times(2)).toPropertyResult(any(PropertyDetailEntity.class));
    }

    @Test
    void executeQuery_shouldReturnEmptyListWhenDatabaseIsEmpty() {
        // Given
        when(propertyDetailRepository.findAllBy(any(Pageable.class))).thenReturn(List.of());

        SearchFirstPropertiesQuery query = new SearchFirstPropertiesQuery();

        // When
        SearchPropertiesQueryResponse response = handler.execute(query);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).isEmpty();

        verify(propertyDetailRepository).findAllBy(any(Pageable.class));
        verify(propertyDetailMapper, never()).toPropertyResult(any());
    }

    @Test
    void executeQuery_shouldMapAllPropertiesWhenMultipleExist() {
        // Given
        PropertyDetailEntity entity1 = createPropertyDetailEntity("1", "Property 1");
        PropertyDetailEntity entity2 = createPropertyDetailEntity("2", "Property 2");
        PropertyDetailEntity entity3 = createPropertyDetailEntity("3", "Property 3");
        PropertyDetailEntity entity4 = createPropertyDetailEntity("4", "Property 4");
        List<PropertyDetailEntity> propertiesToReturn = List.of(entity1, entity2, entity3, entity4);

        SearchPropertiesQueryResponse.PropertyResult result1 = createPropertyResult("1", "Property 1");
        SearchPropertiesQueryResponse.PropertyResult result2 = createPropertyResult("2", "Property 2");
        SearchPropertiesQueryResponse.PropertyResult result3 = createPropertyResult("3", "Property 3");
        SearchPropertiesQueryResponse.PropertyResult result4 = createPropertyResult("4", "Property 4");

        when(propertyDetailRepository.findAllBy(any(Pageable.class))).thenReturn(propertiesToReturn);
        when(propertyDetailMapper.toPropertyResult(entity1)).thenReturn(result1);
        when(propertyDetailMapper.toPropertyResult(entity2)).thenReturn(result2);
        when(propertyDetailMapper.toPropertyResult(entity3)).thenReturn(result3);
        when(propertyDetailMapper.toPropertyResult(entity4)).thenReturn(result4);

        SearchFirstPropertiesQuery query = new SearchFirstPropertiesQuery();

        // When
        SearchPropertiesQueryResponse response = handler.execute(query);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getResult()).hasSize(4);
        assertThat(response.getResult()).containsExactly(result1, result2, result3, result4);

        verify(propertyDetailRepository).findAllBy(any(Pageable.class));
        verify(propertyDetailMapper, times(4)).toPropertyResult(any(PropertyDetailEntity.class));
    }

    @Test
    void executeQuery_shouldUseUnpagedPageable() {
        // Given
        when(propertyDetailRepository.findAllBy(any(Pageable.class))).thenReturn(List.of());

        SearchFirstPropertiesQuery query = new SearchFirstPropertiesQuery();

        // When
        handler.executeQuery(query);

        // Then
        verify(propertyDetailRepository).findAllBy(Pageable.unpaged());
    }

    private PropertyDetailEntity createPropertyDetailEntity(String id, String name) {
        PropertyDetailEntity entity = new PropertyDetailEntity();
        entity.setId(id);
        entity.setName(name);
        entity.setMaxCapacity(4);
        entity.setDescription("Test property description");
        entity.setUrlBucketPhotos("https://example.com/photo.jpg");
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
                "https://example.com/photo.jpg",
                LocalTime.of(14, 0),
                LocalTime.of(11, 0),
                "admin-group-1"
        );
    }
}
