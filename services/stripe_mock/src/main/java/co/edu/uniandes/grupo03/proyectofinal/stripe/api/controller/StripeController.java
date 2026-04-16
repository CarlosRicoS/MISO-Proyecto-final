package co.edu.uniandes.grupo03.proyectofinal.stripe.api.controller;

import co.edu.uniandes.grupo03.proyectofinal.stripe.api.dto.CancelConfirmOperationRequestDto;
import co.edu.uniandes.grupo03.proyectofinal.stripe.api.dto.CreateOperationRequestDto;
import co.edu.uniandes.grupo03.proyectofinal.stripe.api.dto.GeneralResponseDto;
import co.edu.uniandes.grupo03.proyectofinal.stripe.api.dto.StripeConfigurationDto;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;


@Slf4j
@RestController
@RequestMapping("/stripe")
@RequiredArgsConstructor
public class StripeController {

    private StripeConfigurationDto currentConfiguration = new StripeConfigurationDto();

    @PostMapping("/create")
    public ResponseEntity<GeneralResponseDto> createOperation(@RequestBody CreateOperationRequestDto request, @RequestHeader Map<String, String> headers) {

        log.info("Request -> {}", request);
        var delayValue = Optional.ofNullable(headers.get("delay")).map(Long::parseLong).orElse(currentConfiguration.getCreateOperationDelay());
        delay(delayValue);
        return ResponseEntity.ok(new GeneralResponseDto(UUID.randomUUID().toString(), request.getTransactionId()));
    }

    @PostMapping("/confirm")
    public ResponseEntity<GeneralResponseDto> confirmOperation(@RequestBody CancelConfirmOperationRequestDto request, @RequestHeader Map<String, String> headers) {

        log.info("Request -> {}", request);
        var delayValue = Optional.ofNullable(headers.get("delay")).map(Long::parseLong).orElse(currentConfiguration.getConfirmOperationDelay());
        delay(delayValue);
        return ResponseEntity.ok(new GeneralResponseDto(request.getReferencePaymentId(), request.getTransactionId()));
    }

    @PostMapping("/cancel")
    public ResponseEntity<GeneralResponseDto> cancelOperation(@RequestBody CancelConfirmOperationRequestDto request, @RequestHeader Map<String, String> headers) {

        log.info("Request -> {}", request);
        var delayValue = Optional.ofNullable(headers.get("delay")).map(Long::parseLong).orElse(currentConfiguration.getCancelOperationDelay());
        delay(delayValue);
        return ResponseEntity.ok(new GeneralResponseDto(request.getReferencePaymentId(), request.getTransactionId()));
    }

    @PutMapping("/configuration")
    public ResponseEntity<StripeConfigurationDto> cancelOperation(@RequestBody StripeConfigurationDto request) {

        this.currentConfiguration = request;
        return ResponseEntity.ok(this.currentConfiguration);
    }

    @SneakyThrows
    private void delay(long time) {

        Thread.sleep(time);
    }
}
