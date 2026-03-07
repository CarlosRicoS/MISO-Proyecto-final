package co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.exception.ResourceNotFoundException;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.mapper.PropertyDetailMapper;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.QueryHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.infrastructure.persistence.repository.PropertyDetailRepository;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;

@Service
public class SearchPropertyByIdQueryHandler extends QueryHandler<SearchPropertyByIdQuery,
        SearchPropertyByIdQueryResponse> {

    private final PropertyDetailRepository propertyDetailRepository;

    private final PropertyDetailMapper propertyDetailMapper;

    public SearchPropertyByIdQueryHandler(Validator validator, PropertyDetailRepository propertyDetailRepository,
                                          PropertyDetailMapper propertyDetailMapper) {
        super(validator);
        this.propertyDetailRepository = propertyDetailRepository;
        this.propertyDetailMapper = propertyDetailMapper;
    }

    @Override
    protected SearchPropertyByIdQueryResponse executeQuery(SearchPropertyByIdQuery query) {
        return propertyDetailRepository.findById(query.getId()).map(propertyDetailMapper::toSearchByIdResponse)
                .orElseThrow(() -> new ResourceNotFoundException("The property with id %s could not be found.".formatted(query.getId())));
    }
}
