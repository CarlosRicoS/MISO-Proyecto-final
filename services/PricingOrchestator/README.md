# Pricing Orchestrator Microservice

Orchestration service for TravelHub that aggregates property details and dynamically calculated prices. Built with ASP.NET Core 8.0.

## Base URL

**Production:** `https://{api-gateway-url}/pricing-orchestrator`

## Endpoints

### Health Check

```
GET /api/Health
```

**Response** `200 OK`

---

### Get Property with Price

```
GET /api/Property
```

Aggregates static property data from the Properties Service and dynamic pricing from the Pricing Engine.

**Query Parameters**

| Parameter    | Type    | Required | Description                                  |
|--------------|---------|----------|----------------------------------------------|
| PropertyId   | UUID    | Yes      | ID of the property to retrieve               |
| Guests       | integer | Yes      | Number of guests (for price calculation)     |
| DateInit     | date    | Yes      | Check-in date (`YYYY-MM-DD`)                 |
| DateFinish   | date    | Yes      | Check-out date (`YYYY-MM-DD`)                |
| DiscountCode | string  | No       | Optional discount code                       |

#### Example

**Request**
```bash
curl "https://{api-gateway-url}/pricing-orchestrator/api/Property?propertyId=660e8400-e29b-41d4-a716-446655440000&guests=2&dateInit=2026-06-01&dateFinish=2026-06-05"
```

**Response** `200 OK`
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "name": "Ocean View Apartment",
  "maxCapacity": 4,
  "description": "Luxurious apartment with panoramic views.",
  "urlBucketPhotos": "https://...",
  "checkInTime": "15:00",
  "checkOutTime": "11:00",
  "adminGroupId": "770e8400-e29b-41d4-a716-446655440000",
  "price": 250.00
}
```

---

### Error Responses

| Status | Condition                                    | Example Response                                              |
|--------|----------------------------------------------|---------------------------------------------------------------|
| 400    | Validation Error                             | `{"errors": {"PropertyId": ["PropertyId is required."]}}`   |
| 500    | Downstream service failure                   | `{"detail": "Failed to retrieve data from one or more services"}`|

---

## Local Development

### Prerequisites
- .NET 8.0 SDK

### Configuration
The service depends on two external microservices. Configure them via environment variables:

| Variable               | Description                               | Default (appsettings.json) |
|------------------------|-------------------------------------------|----------------------------|
| PROPERTIES_ENGINE_URL  | Base URL for the Properties microservice  | (Empty)                    |
| PRICING_SERVICE_URL    | Base URL for the Pricing microservice     | (Empty)                    |

### Execution
```bash
# Navigate to project folder
cd PricingOrchestator

# Set environment variables (Linux/macOS example)
export PROPERTIES_ENGINE_URL=http://localhost:8080
export PRICING_SERVICE_URL=http://localhost:5254

# Run the project
dotnet run

# Interactive API docs (Swagger) available at:
# http://localhost:5171/swagger (if enabled)
```

---

## Running Tests

```bash
# Run all tests
dotnet test ../PricingOrchestatorTests/
```

---

## Architecture

The service acts as an **API Gateway / Orchestrator** for property-related data:

```
PricingOrchestator/
├── Controllers/         # API Endpoints (Health, Property)
├── Models/              # Aggregated DTOs
│   ├── Property.cs      # Merged property and price model
│   ├── PropertyPriceRequest.cs
│   └── Validators/      # FluentValidation rules
├── Program.cs           # Service bootstrap, HttpClient registration
└── appsettings.json     # Service configuration
```

**Orchestration Logic:**
1. Validates incoming query parameters.
2. Initiates parallel requests to:
   - **Properties Service:** To fetch static metadata (name, capacity, description).
   - **Pricing Engine:** To fetch the calculated price based on dates and guests.
3. Merges the results into a single response object.
4. Handles partial failures and timeouts.
