package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.mapper.PropertyDetailMapper;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.PageableQueryHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.PropertyDetailRepository;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.specification.SearchPropertySpecification;
import jakarta.validation.Validator;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class SearchPropertiesQueryHandler extends PageableQueryHandler<SearchPropertiesQuery, SearchPropertiesQueryResponse> {

    private final PropertyDetailRepository propertyDetailRepository;

    private final PropertyDetailMapper propertyDetailMapper;

    public SearchPropertiesQueryHandler(Validator validator, PropertyDetailRepository propertyDetailRepository,
                                        PropertyDetailMapper propertyDetailMapper) {
        super(validator);
        this.propertyDetailRepository = propertyDetailRepository;
        this.propertyDetailMapper = propertyDetailMapper;
    }

    @Override
    protected SearchPropertiesQueryResponse executeQuery(SearchPropertiesQuery query, Pageable page) {

        var specification = SearchPropertySpecification.findAvailableProperties(query.getCity(), query.getCapacity(),
                query.getStartDate(), query.getEndDate());
        return new SearchPropertiesQueryResponse(propertyDetailRepository.findAll(specification, page).getContent().stream().map(propertyDetailMapper::toPropertyResult).toList());
    }
}
