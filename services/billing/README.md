# Billing Microservice

Billing microservice for TravelHub, built with **Spring Boot** and **PostgreSQL**. It manages billing records for bookings and processes billing operations **asynchronously** by consuming messages from an **AWS SQS** queue.

## Base URL

This service runs with `server.servlet.context-path: /api`.

- **Production (via API Gateway):** `https://{api-gateway-url}/billing/api`
- **Local (default):** `http://localhost:8080/api`

## Key Components

- **Commands (write side)**: `src/main/java/**/business/command/**`
  - `CreateBillingCommandHandler`
  - `ConfirmBillingCommandHandler`
  - `CancelBillingCommandHandler`
- **SQS Listener (integration)**: `src/main/java/**/contract/sqs/listener/BillingSqsListener.java`
- **Persistence**:
  - Entity: `src/main/java/**/infrastructure/persistence/entity/BillingEntity.java`
  - Repository: `src/main/java/**/infrastructure/persistence/repository/BillingRepository.java`

## Billing Lifecycle

The service persists a `BillingEntity` with these state transitions:

- `PENDING` (initial, created on `CREATE`)
- `CONFIRMED` (on `CONFIRM`, only if current state is `PENDING`)
- `CANCELLED` (on `CANCEL`, unless already `CANCELLED`)

## Health Check

```http
GET /api/actuator/health
```

## SQS Message Contract

Billing messages are JSON with 2 fields: `operation` and `payload`.

### DTO

Implemented at: `src/main/java/**/contract/sqs/dto/BillingMessageDto.java`

```json
{
  "operation": "CREATE|CONFIRM|CANCEL",
  "payload": {
    "bookingId": "...",
    "paymentReference": "...",
    "paymentDate": "2026-04-16T10:15:30",
    "adminGroupId": "...",
    "value": "1250.50",
    "reason": "..."
  }
}
```

### Operation details

- **CREATE**
  - Required keys (as parsed by `BillingSqsListener`):
    - `bookingId`, `paymentReference`, `paymentDate` (ISO-8601), `adminGroupId`, `value`
  - Effect:
    - Stores a new `BillingEntity` with `state = PENDING`, `id = UUID.randomUUID()`, `updateDate = now`

- **CONFIRM**
  - Required keys:
    - `bookingId`
  - Effect:
    - Loads billing by `bookingId`, validates it is `PENDING`, sets `state = CONFIRMED`, updates `updateDate`

- **CANCEL**
  - Required keys:
    - `bookingId`, `reason`
  - Effect:
    - Loads billing by `bookingId`, validates it is not `CANCELLED`, sets `state = CANCELLED`, sets `reason`, updates `updateDate`

## Local Development

```bash
cd services/billing

# Compile
./mvnw clean compile

# Run unit tests
./mvnw test

# Run locally
./mvnw spring-boot:run
```

## Configuration

Main configuration file: `src/main/resources/application.yml`

### Database (PostgreSQL)

Configured in `application.yml`:

- `DB_HOST` (default `localhost`)
- `DB_NAME` (default `postgres`)
- `DB_USERNAME` (default `postgres`)
- `DB_PASSWORD` (default `123456`)

### SQS Listener

The polling consumer is enabled/disabled with:

```yaml
billing.listener.sqs.enabled: ${BILLING_SQS_LISTENER_ENABLED:true}
```

Configuration keys (from `application.yml`):

- `billing.listener.sqs.queue-url` (`BILLING_QUEUE_URL`)
- `billing.listener.sqs.max-messages` (`BILLING_SQS_MAX_MESSAGES`, default `10`)
- `billing.listener.sqs.wait-time-seconds` (`BILLING_SQS_WAIT_TIME_SECONDS`, default `20`)
- `billing.listener.sqs.visibility-timeout-seconds` (`BILLING_SQS_VISIBILITY_TIMEOUT_SECONDS`, default `30`)
- `billing.listener.sqs.poll-delay-ms` (`BILLING_SQS_POLL_DELAY_MS`, default `1000`)
- `billing.listener.sqs.region` (`AWS_REGION`)
- `billing.listener.sqs.security.access-key` (`AWS_ACCESS_KEY`)
- `billing.listener.sqs.security.secret-key` (`AWS_SECRET_KEY`)

## Notes / Known Issues

- `spring.application.name` in `application.yml` is currently set to `poc_properties` (copied config). Consider changing it to `billing`.
- `BillingSqsListener` acknowledges (deletes) messages even if processing fails (best-effort). See `processMessage()`.
