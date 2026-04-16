package co.edu.uniandes.grupo03.proyectofinal.billing.contract.sqs.listener;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.CommandHandler;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing.CancelBillingCommand;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing.ConfirmBillingCommand;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing.CreateBillingCommand;
import co.edu.uniandes.grupo03.proyectofinal.billing.contract.sqs.dto.BillingMessageDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Component
@ConditionalOnProperty(prefix = "billing.listener.sqs", name = "enabled", havingValue = "true")
public class BillingSqsListener {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final SqsClient sqsClient;

    private final CommandHandler<CreateBillingCommand, EmptyCommandResponse> createBillingCommandHandler;

    private final CommandHandler<ConfirmBillingCommand, EmptyCommandResponse> confirmBillingCommandHandler;

    private final CommandHandler<CancelBillingCommand, EmptyCommandResponse> cancelBillingCommandHandler;

    private final String queueUrl;

    private final Integer maxMessages;

    private final Integer waitTimeSeconds;

    private final Integer visibilityTimeoutSeconds;

    public BillingSqsListener(SqsClient sqsClient, CommandHandler<CreateBillingCommand, EmptyCommandResponse> createBillingCommandHandler,
                              CommandHandler<ConfirmBillingCommand, EmptyCommandResponse> confirmBillingCommandHandler,
                              CommandHandler<CancelBillingCommand, EmptyCommandResponse> cancelBillingCommandHandler,
                              @Value("${billing.listener.sqs.queue-url}") String queueUrl,
                              @Value("${billing.listener.sqs.max-messages}") Integer maxMessages,
                              @Value("${billing.listener.sqs.wait-time-seconds}") Integer waitTimeSeconds,
                              @Value("${billing.listener.sqs.visibility-timeout-seconds}") Integer visibilityTimeoutSeconds) {
        this.sqsClient = sqsClient;
        this.createBillingCommandHandler = createBillingCommandHandler;
        this.confirmBillingCommandHandler = confirmBillingCommandHandler;
        this.cancelBillingCommandHandler = cancelBillingCommandHandler;
        this.queueUrl = queueUrl;
        this.maxMessages = maxMessages;
        this.waitTimeSeconds = waitTimeSeconds;
        this.visibilityTimeoutSeconds = visibilityTimeoutSeconds;
    }

    @Scheduled(fixedDelayString = "${billing.listener.sqs.poll-delay-ms}")
    public void poll() {

        log.info("Polling ...");

        ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                .queueUrl(queueUrl)
                .maxNumberOfMessages(maxMessages)
                .waitTimeSeconds(waitTimeSeconds)
                .visibilityTimeout(visibilityTimeoutSeconds)
                .build();

        var response = sqsClient.receiveMessage(request);
        for (Message message : response.messages()) {
            processMessage(message);
        }
    }

    private void processMessage(Message message) {
        try {

            var billingMessage = OBJECT_MAPPER.readValue(message.body(), BillingMessageDto.class);

            if (billingMessage.getOperation().equals("CREATE")) {

                var bookingId = billingMessage.getPayload().get("bookingId").toString();
                var paymentReference = billingMessage.getPayload().get("paymentReference").toString();
                var paymentDate = LocalDateTime.parse(billingMessage.getPayload().get("paymentDate").toString(), DateTimeFormatter.ISO_DATE_TIME);
                var adminGroupId = billingMessage.getPayload().get("adminGroupId").toString();
                var value = new BigDecimal(billingMessage.getPayload().get("value").toString());
                CreateBillingCommand command = new CreateBillingCommand(bookingId, paymentReference, paymentDate, adminGroupId, value);
                createBillingCommandHandler.handle(command);

            } else if (billingMessage.getOperation().equals("CONFIRM")) {

                var bookingId = billingMessage.getPayload().get("bookingId").toString();
                ConfirmBillingCommand command = new ConfirmBillingCommand(bookingId);
                confirmBillingCommandHandler.handle(command);
            } else if (billingMessage.getOperation().equals("CANCEL")) {

                var bookingId = billingMessage.getPayload().get("bookingId").toString();
                var reason = billingMessage.getPayload().get("reason").toString();
                CancelBillingCommand command = new CancelBillingCommand(bookingId, reason);
                cancelBillingCommandHandler.handle(command);
            } else {

                log.error("Operation not supported: {}", billingMessage.getOperation());
            }
            acknowledge(message.receiptHandle());
        } catch (Exception e) {

            log.error("Failed to process billing message id {}", message.messageId(), e);
            acknowledge(message.receiptHandle());
        }
    }

    private void acknowledge(String receiptHandle) {
        sqsClient.deleteMessage(DeleteMessageRequest.builder()
                .queueUrl(queueUrl)
                .receiptHandle(receiptHandle)
                .build());
    }
}