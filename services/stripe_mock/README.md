# Stripe Mock Microservice

Mock implementation of a subset of **Stripe-like** payment operations for TravelHub. Built with **Spring Boot** and exposes simple endpoints to simulate payment **create / confirm / cancel** flows with configurable artificial delay.

## Base URL

Configured in `src/main/resources/application.yml`:

- `server.servlet.context-path: /api`
- `server.port: 8080`

So the base URL is:

- **Local:** `http://localhost:8080/api`
- **Production (via API Gateway):** `https://{api-gateway-url}/stripe-mock/api`

## Endpoints

All endpoints are implemented in:
- `src/main/java/co/edu/uniandes/grupo03/proyectofinal/stripe/api/controller/StripeController.java`

### Health Check

```http
GET /api/actuator/health
```

**Response** `200 OK`
```json
{
  "status": "UP"
}
```

---

### Create operation

```http
POST /api/stripe/create
```

**Headers (optional)**
- `delay`: override delay in milliseconds (string, parsed as long)

**Request body** (`CreateOperationRequestDto`)

```json
{
  "transactionId": "tx-123",
  "currency": "COP",
  "paymentMethodType": "card",
  "amount": 100.00
}
```

**Response** `200 OK` (`GeneralResponseDto`)

```json
{
  "referencePaymentId": "<uuid>",
  "transactionId": "tx-123"
}
```

Notes:
- `referencePaymentId` is generated with `UUID.randomUUID()`.

---

### Confirm operation

```http
POST /api/stripe/confirm
```

**Headers (optional)**
- `delay`: override delay in milliseconds

**Request body** (`CancelConfirmOperationRequestDto`)

```json
{
  "referencePaymentId": "ref-1",
  "transactionId": "tx-123"
}
```

**Response** `200 OK` (`GeneralResponseDto`)

```json
{
  "referencePaymentId": "ref-1",
  "transactionId": "tx-123"
}
```

---

### Cancel operation

```http
POST /api/stripe/cancel
```

**Headers (optional)**
- `delay`: override delay in milliseconds

**Request body** (`CancelConfirmOperationRequestDto`)

```json
{
  "referencePaymentId": "ref-1",
  "transactionId": "tx-123"
}
```

**Response** `200 OK` (`GeneralResponseDto`)

```json
{
  "referencePaymentId": "ref-1",
  "transactionId": "tx-123"
}
```

---

### Update configuration (delays)

```http
PUT /api/stripe/configuration
```

Updates the in-memory delay configuration used by operations when the `delay` header is not provided.

**Request/Response body** (`StripeConfigurationDto`)

```json
{
  "createOperationDelay": 1000,
  "confirmOperationDelay": 1000,
  "cancelOperationDelay": 1000
}
```

## Delay behavior

Each operation:
- checks header `delay`
- if absent, uses the corresponding configured delay from `StripeConfigurationDto`
- sleeps via `Thread.sleep(delayMs)`

See `StripeController.delay(long)`.

## Local Development

```bash
cd services/stripe_mock

# Build
./mvnw clean compile

# Run tests
./mvnw test

# Run locally
./mvnw spring-boot:run
```

## Tests

Unit tests live under:
- `src/test/java/.../StripeControllerTest.java`

They call controller methods directly and set `delay=0` to avoid sleeping.

## Technical Stack

- Java 25
- Spring Boot 4.0.3
- Spring WebMVC
- Spring Boot Actuator + Prometheus
- Testing: JUnit 5, AssertJ (`spring-boot-starter-test`)
