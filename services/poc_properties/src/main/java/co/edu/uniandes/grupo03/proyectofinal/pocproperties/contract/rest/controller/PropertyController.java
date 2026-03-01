package co.edu.uniandes.grupo03.proyectofinal.pocproperties.contract.rest.controller;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.CommandHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.propertydetail.LockPropertyCommand;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.QueryHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail.SearchPropertiesQuery;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail.SearchPropertiesQueryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/property")
@RequiredArgsConstructor
public class PropertyController {

    private final QueryHandler<SearchPropertiesQuery, SearchPropertiesQueryResponse> searchPropertiesQueryHandler;

    private final CommandHandler<LockPropertyCommand, EmptyCommandResponse> lockPropertyCommandHandler;

    @GetMapping
    public ResponseEntity<List<SearchPropertiesQueryResponse.PropertyResult>> searchProperties(SearchPropertiesQuery query, Pageable pageable) {
        var result = searchPropertiesQueryHandler.execute(query, pageable);
        return ResponseEntity.ok(result.getResult());
    }

    @PostMapping("/lock")
    public ResponseEntity<Void> lockProperty(@RequestBody LockPropertyCommand command) {

        lockPropertyCommandHandler.handle(command);
        return ResponseEntity.noContent().build();
    }
}
