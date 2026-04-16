package co.edu.uniandes.grupo03.proyectofinal.billing.contract.sqs.listener;

import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.CommandHandler;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.EmptyCommandResponse;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing.CancelBillingCommand;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing.ConfirmBillingCommand;
import co.edu.uniandes.grupo03.proyectofinal.billing.business.command.billing.CreateBillingCommand;
import co.edu.uniandes.grupo03.proyectofinal.billing.contract.sqs.dto.BillingMessageDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageResponse;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillingSqsListenerTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Mock
    private SqsClient sqsClient;

    @Mock
    private CommandHandler<CreateBillingCommand, EmptyCommandResponse> createBillingCommandHandler;

    @Mock
    private CommandHandler<ConfirmBillingCommand, EmptyCommandResponse> confirmBillingCommandHandler;

    @Mock
    private CommandHandler<CancelBillingCommand, EmptyCommandResponse> cancelBillingCommandHandler;

    private BillingSqsListener listener;

    @BeforeEach
    void setUp() {
        listener = new BillingSqsListener(
                sqsClient,
                createBillingCommandHandler,
                confirmBillingCommandHandler,
                cancelBillingCommandHandler,
                "https://sqs.us-east-1.amazonaws.com/123456789012/billing-queue",
                10,
                20,
                30
        );
    }

    @Test
    void poll_shouldDispatchCreateOperationAndAcknowledgeMessage() throws Exception {
        // Given
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("bookingId", "booking-123");
        payload.put("paymentReference", "payment-ref-456");
        payload.put("paymentDate", "2026-04-16T10:15:30");
        payload.put("adminGroupId", "admin-group-789");
        payload.put("value", "1250.50");

        BillingMessageDto billingMessage = new BillingMessageDto("CREATE", payload);
        Message message = buildMessage("message-1", "receipt-1", OBJECT_MAPPER.writeValueAsString(billingMessage));

        when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                .thenReturn(ReceiveMessageResponse.builder().messages(List.of(message)).build());

        // When
        listener.poll();

        // Then
        ArgumentCaptor<ReceiveMessageRequest> requestCaptor = ArgumentCaptor.forClass(ReceiveMessageRequest.class);
        verify(sqsClient).receiveMessage(requestCaptor.capture());

        ReceiveMessageRequest request = requestCaptor.getValue();
        assertThat(request.queueUrl()).isEqualTo("https://sqs.us-east-1.amazonaws.com/123456789012/billing-queue");
        assertThat(request.maxNumberOfMessages()).isEqualTo(10);
        assertThat(request.waitTimeSeconds()).isEqualTo(20);
        assertThat(request.visibilityTimeout()).isEqualTo(30);

        ArgumentCaptor<CreateBillingCommand> commandCaptor = ArgumentCaptor.forClass(CreateBillingCommand.class);
        verify(createBillingCommandHandler).handle(commandCaptor.capture());
        verify(confirmBillingCommandHandler, never()).handle(any());
        verify(cancelBillingCommandHandler, never()).handle(any());

        CreateBillingCommand command = commandCaptor.getValue();
        assertThat(command.getBookingId()).isEqualTo("booking-123");
        assertThat(command.getPaymentReference()).isEqualTo("payment-ref-456");
        assertThat(command.getPaymentDate()).isEqualTo(LocalDateTime.parse("2026-04-16T10:15:30"));
        assertThat(command.getAdminGroupId()).isEqualTo("admin-group-789");
        assertThat(command.getValue()).isEqualByComparingTo(new BigDecimal("1250.50"));

        ArgumentCaptor<DeleteMessageRequest> deleteRequestCaptor = ArgumentCaptor.forClass(DeleteMessageRequest.class);
        verify(sqsClient).deleteMessage(deleteRequestCaptor.capture());
        assertThat(deleteRequestCaptor.getValue().queueUrl()).isEqualTo("https://sqs.us-east-1.amazonaws.com/123456789012/billing-queue");
        assertThat(deleteRequestCaptor.getValue().receiptHandle()).isEqualTo("receipt-1");
    }

    @Test
    void poll_shouldDispatchConfirmOperationAndAcknowledgeMessage() throws Exception {
        // Given
        Map<String, Object> payload = Map.of("bookingId", "booking-123");
        BillingMessageDto billingMessage = new BillingMessageDto("CONFIRM", payload);
        Message message = buildMessage("message-2", "receipt-2", OBJECT_MAPPER.writeValueAsString(billingMessage));

        when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                .thenReturn(ReceiveMessageResponse.builder().messages(List.of(message)).build());

        // When
        listener.poll();

        // Then
        ArgumentCaptor<ConfirmBillingCommand> commandCaptor = ArgumentCaptor.forClass(ConfirmBillingCommand.class);
        verify(confirmBillingCommandHandler).handle(commandCaptor.capture());
        verify(createBillingCommandHandler, never()).handle(any());
        verify(cancelBillingCommandHandler, never()).handle(any());
        assertThat(commandCaptor.getValue().getBookingId()).isEqualTo("booking-123");

        ArgumentCaptor<DeleteMessageRequest> deleteRequestCaptor = ArgumentCaptor.forClass(DeleteMessageRequest.class);
        verify(sqsClient).deleteMessage(deleteRequestCaptor.capture());
        assertThat(deleteRequestCaptor.getValue().queueUrl()).isEqualTo("https://sqs.us-east-1.amazonaws.com/123456789012/billing-queue");
        assertThat(deleteRequestCaptor.getValue().receiptHandle()).isEqualTo("receipt-2");
    }

    @Test
    void poll_shouldDispatchCancelOperationAndAcknowledgeMessage() throws Exception {
        // Given
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("bookingId", "booking-123");
        payload.put("reason", "Customer requested cancellation");
        BillingMessageDto billingMessage = new BillingMessageDto("CANCEL", payload);
        Message message = buildMessage("message-3", "receipt-3", OBJECT_MAPPER.writeValueAsString(billingMessage));

        when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                .thenReturn(ReceiveMessageResponse.builder().messages(List.of(message)).build());

        // When
        listener.poll();

        // Then
        ArgumentCaptor<CancelBillingCommand> commandCaptor = ArgumentCaptor.forClass(CancelBillingCommand.class);
        verify(cancelBillingCommandHandler).handle(commandCaptor.capture());
        verify(createBillingCommandHandler, never()).handle(any());
        verify(confirmBillingCommandHandler, never()).handle(any());
        assertThat(commandCaptor.getValue().getBookingId()).isEqualTo("booking-123");
        assertThat(commandCaptor.getValue().getReason()).isEqualTo("Customer requested cancellation");

        ArgumentCaptor<DeleteMessageRequest> deleteRequestCaptor = ArgumentCaptor.forClass(DeleteMessageRequest.class);
        verify(sqsClient).deleteMessage(deleteRequestCaptor.capture());
        assertThat(deleteRequestCaptor.getValue().queueUrl()).isEqualTo("https://sqs.us-east-1.amazonaws.com/123456789012/billing-queue");
        assertThat(deleteRequestCaptor.getValue().receiptHandle()).isEqualTo("receipt-3");
    }

    @Test
    void poll_shouldAcknowledgeUnknownOperationsWithoutDispatchingHandlers() throws Exception {
        // Given
        BillingMessageDto billingMessage = new BillingMessageDto("UNKNOWN", Map.of("bookingId", "booking-123"));
        Message message = buildMessage("message-4", "receipt-4", OBJECT_MAPPER.writeValueAsString(billingMessage));

        when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                .thenReturn(ReceiveMessageResponse.builder().messages(List.of(message)).build());

        // When
        listener.poll();

        // Then
        verifyNoInteractions(createBillingCommandHandler, confirmBillingCommandHandler, cancelBillingCommandHandler);
        ArgumentCaptor<DeleteMessageRequest> deleteRequestCaptor = ArgumentCaptor.forClass(DeleteMessageRequest.class);
        verify(sqsClient).deleteMessage(deleteRequestCaptor.capture());
        assertThat(deleteRequestCaptor.getValue().queueUrl()).isEqualTo("https://sqs.us-east-1.amazonaws.com/123456789012/billing-queue");
        assertThat(deleteRequestCaptor.getValue().receiptHandle()).isEqualTo("receipt-4");
    }

    @Test
    void poll_shouldAcknowledgeMalformedMessagesAndSkipDispatchingHandlers() {
        // Given
        Message message = buildMessage("message-5", "receipt-5", "{invalid-json");

        when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                .thenReturn(ReceiveMessageResponse.builder().messages(List.of(message)).build());

        // When
        listener.poll();

        // Then
        verifyNoInteractions(createBillingCommandHandler, confirmBillingCommandHandler, cancelBillingCommandHandler);
        ArgumentCaptor<DeleteMessageRequest> deleteRequestCaptor = ArgumentCaptor.forClass(DeleteMessageRequest.class);
        verify(sqsClient).deleteMessage(deleteRequestCaptor.capture());
        assertThat(deleteRequestCaptor.getValue().queueUrl()).isEqualTo("https://sqs.us-east-1.amazonaws.com/123456789012/billing-queue");
        assertThat(deleteRequestCaptor.getValue().receiptHandle()).isEqualTo("receipt-5");
    }

    private Message buildMessage(String messageId, String receiptHandle, String body) {
        return Message.builder()
                .messageId(messageId)
                .receiptHandle(receiptHandle)
                .body(body)
                .build();
    }
}

