package co.edu.uniandes.grupo03.proyectofinal.stripe.api.conf;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;

@Slf4j
@RestControllerAdvice
public class GeneralExceptionHandler {

    @ExceptionHandler(exception = {Exception.class})
    public ResponseEntity<ErrorResponseDto> processDefault(Exception exception) {

        log.error("Unexpected exception.", exception);
        var errorResponse = new ErrorResponseDto("Unexpected error, check logs.", LocalDateTime.now());
        return new ResponseEntity<>(errorResponse, HttpStatusCode.valueOf(500));
    }

    public record ErrorResponseDto(String error, LocalDateTime date) {

    }
}
