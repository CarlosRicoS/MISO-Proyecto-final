package co.edu.uniandes.grupo03.proyectofinal.pocproperties.contract.rest.controller;

import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.CommandHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.propertydetail.LockPropertyCommand;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.command.propertydetail.UnlockPropertyCommand;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.PageableQueryHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.QueryHandler;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail.SearchPropertiesQuery;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail.SearchPropertiesQueryResponse;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail.SearchPropertyByIdQuery;
import co.edu.uniandes.grupo03.proyectofinal.pocproperties.business.query.propertydetail.SearchPropertyByIdQueryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/property")
@RequiredArgsConstructor
public class PropertyController {

    private final PageableQueryHandler<SearchPropertiesQuery, SearchPropertiesQueryResponse> searchPropertiesQueryHandler;

    private final QueryHandler<SearchPropertyByIdQuery, SearchPropertyByIdQueryResponse> searchPropertyByIdQueryHandler;

    private final CommandHandler<LockPropertyCommand, EmptyCommandResponse> lockPropertyCommandHandler;

    private final CommandHandler<UnlockPropertyCommand, EmptyCommandResponse> unlockPropertyCommandHandler;

    @GetMapping
    public ResponseEntity<List<SearchPropertiesQueryResponse.PropertyResult>> searchProperties(SearchPropertiesQuery query,
                                                                                               @PageableDefault(page = 0, size = 10) Pageable pageable) {
        var result = searchPropertiesQueryHandler.execute(query, pageable);
        return ResponseEntity.ok(result.getResult());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SearchPropertyByIdQueryResponse> searchPropertyById(@PathVariable String id) {
        var result = searchPropertyByIdQueryHandler.execute(new SearchPropertyByIdQuery(id));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/lock")
    public ResponseEntity<Void> lockProperty(@RequestBody LockPropertyCommand command) {

        lockPropertyCommandHandler.handle(command);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/unlock")
    public ResponseEntity<Void> unlockProperty(@RequestBody UnlockPropertyCommand command) {

        unlockPropertyCommandHandler.handle(command);
        return ResponseEntity.noContent().build();
    }
}
