package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.mapper.PropertyDetailMapper;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.QueryHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.PropertyDetailRepository;
import jakarta.validation.Validator;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class SearchFirstPropertiesQueryHandler extends QueryHandler<SearchFirstPropertiesQuery, SearchPropertiesQueryResponse> {

    private final PropertyDetailRepository propertyDetailRepository;

    private final PropertyDetailMapper propertyDetailMapper;

    public SearchFirstPropertiesQueryHandler(Validator validator, PropertyDetailRepository propertyDetailRepository, PropertyDetailMapper propertyDetailMapper) {
        super(validator);
        this.propertyDetailRepository = propertyDetailRepository;
        this.propertyDetailMapper = propertyDetailMapper;
    }

    @Override
    public SearchPropertiesQueryResponse executeQuery(SearchFirstPropertiesQuery query) {

        var firstProperties = propertyDetailRepository.findAllBy(Pageable.unpaged());
        return new SearchPropertiesQueryResponse(firstProperties.stream().map(propertyDetailMapper::toPropertyResult).toList());
    }
}
