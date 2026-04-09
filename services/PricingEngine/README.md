# Pricing Engine Microservice

Microservice for managing property pricing, calculation rules, and discounts for TravelHub. Built with ASP.NET Core 8.0 and Entity Framework Core.

## Base URL

**Production:** `https://{api-gateway-url}/pricing-engine`

## Endpoints

### Health Check

```
GET /api/Health
```

**Response** `200 OK`

---

### Get Property Price

```
GET /api/PropertyPrice
```

Calculates the total stay price for a property, including base price, guest-based rules, and seasonal discounts.

**Query Parameters**

| Parameter    | Type    | Required | Description                                  |
|--------------|---------|----------|----------------------------------------------|
| PropertyId   | UUID    | Yes      | ID of the property to calculate price for    |
| Guests       | integer | Yes      | Number of guests (must be > 0)               |
| DateInit     | date    | Yes      | Start date (`YYYY-MM-DD`, must be >= today)  |
| DateFinish   | date    | Yes      | End date (`YYYY-MM-DD`, must be > DateInit)  |
| DiscountCode | string  | No       | Optional discount code                       |

#### Example

**Request**
```bash
curl "https://{api-gateway-url}/pricing-engine/api/PropertyPrice?propertyId=660e8400-e29b-41d4-a716-446655440000&guests=2&dateInit=2026-06-01&dateFinish=2026-06-05"
```

**Response** `200 OK`
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "price": 250.00
}
```

---

### Error Responses

| Status | Condition                                    | Example Response                                              |
|--------|----------------------------------------------|---------------------------------------------------------------|
| 400    | Validation Error                             | `{"errors": {"Guests": ["Guests must be greater than 0."]}}` |
| 500    | Internal Server Error (e.g. Pricing not found)| `{"detail": "Pricing not found"}`                             |

---

## Local Development

### Prerequisites
- .NET 8.0 SDK
- PostgreSQL instance

### Configuration
The service uses environment variables for database connectivity:

| Variable    | Description                                      | Default (appsettings.json) |
|-------------|--------------------------------------------------|-----------------------------|
| DB_HOST     | PostgreSQL host                                  | `host.docker.internal`      |
| DB_NAME     | Database name                                    | `PricingRuleDB`             |
| DB_USERNAME | Database username                                | `sa`                        |
| DB_PASSWORD | Database password                                | `password`                  |
| DB_PORT     | Database port                                    | `5432`                      |

### Execution
```bash
# Navigate to project folder
cd PricingEngine

# Run the project
dotnet run

# Interactive API docs (Swagger) available at:
# http://localhost:5254/swagger (if enabled)
```

> **Note:** The service automatically runs `dbContext.Database.EnsureCreated()` on startup to initialize the schema.

---

## Running Tests

```bash
# Run all tests
dotnet test ../PricingEngineTests/
```

---

## Architecture

The service follows a layered approach within the .NET ecosystem:

```
PricingEngine/
├── Controllers/         # API Endpoints (Health, PropertyPrice)
├── Database/            # Data Access Layer
│   ├── DatabaseContext.cs # EF Core DbContext
│   ├── DatabaseOperations.cs # Business logic for price calculation
│   └── IDatabaseOperations.cs # Interface for dependency injection
├── Models/              # DTOs and Database Entities
│   ├── Pricing.cs       # Base price entity
│   ├── PricingRule.cs   # Seasonal/Guest rules entity
│   ├── Discount.cs      # Discount coupons entity
│   └── Validators/      # FluentValidation rules
├── Program.cs           # Service bootstrap and DI configuration
└── appsettings.json     # Default configuration
```

**Pricing Calculation Logic:**
1. Retrieve base price for the property.
2. Identify rules that intersect the requested date range and guest count.
3. Calculate nightly prices by applying applicable rule percentages.
4. Apply discount code if provided and valid (unexpired, unused).
5. Return rounded total price.
