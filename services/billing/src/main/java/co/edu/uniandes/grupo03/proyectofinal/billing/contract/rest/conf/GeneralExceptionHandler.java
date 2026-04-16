package co.edu.uniandes.grupo03.proyectofinal.billing.contract.rest.conf;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.InvalidInputDataException;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.InvalidResponseDataException;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.ResourceAlreadyExistsException;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@Slf4j
@RestControllerAdvice
public class GeneralExceptionHandler {

    @ExceptionHandler(exception = {InvalidInputDataException.class, ResourceAlreadyExistsException.class,
            InvalidResponseDataException.class})
    public ResponseEntity<ErrorResponseDto> processBadRequest(Exception exception) {

        return ResponseEntity.badRequest().body(new ErrorResponseDto(exception.getMessage(), LocalDateTime.now()));
    }

    @ExceptionHandler(exception = {ResourceNotFoundException.class})
    public ResponseEntity<ErrorResponseDto> processNotFound(Exception exception) {

        var errorResponse = new ErrorResponseDto(exception.getMessage(), LocalDateTime.now());
        return new ResponseEntity<>(errorResponse, HttpStatusCode.valueOf(404));
    }

    @ExceptionHandler(exception = {Exception.class})
    public ResponseEntity<ErrorResponseDto> processDefault(Exception exception) {

        log.error("Unexpected exception.", exception);
        var errorResponse = new ErrorResponseDto("Unexpected error, check logs.", LocalDateTime.now());
        return new ResponseEntity<>(errorResponse, HttpStatusCode.valueOf(500));
    }

    public record ErrorResponseDto(String error, LocalDateTime date) {

    }
}
