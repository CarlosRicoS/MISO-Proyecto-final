# Properties PoC Microservice

Proof of concept for the property management and search service for TravelHub, built with Spring Boot and PostgreSQL. This service handles property listings, availability searching, and booking locks.

## Base URL

**Production:** `https://{api-gateway-url}/property`

## Endpoints

### Health Check

```
GET /api/actuator/health
```

**Response** `200 OK`
```json
{
  "status": "UP"
}
```

---

### Search Properties

```
GET /api/property
```

Searches for available properties based on location, capacity, and dates. Supports pagination.

**Query Parameters**

| Parameter    | Type    | Required | Description                                      |
|--------------|---------|----------|--------------------------------------------------|
| city         | string  | No*      | City to search in                                |
| capacity     | integer | No*      | Minimum required capacity                        |
| startDate    | string  | No*      | Format: `dd/MM/yyyy`                             |
| endDate      | string  | No*      | Format: `dd/MM/yyyy`                             |
| page         | integer | No       | Page number (default: 0)                         |
| size         | integer | No       | Items per page (default: 10)                     |

*\*Note: While optional individually, typical searches require all four criteria to filter by availability. Providing no filters returns all properties.*

#### Example

**Request**
```bash
curl -X GET "https://{api-gateway-url}/property/api/property?city=Bogota&capacity=4&startDate=01/12/2024&endDate=10/12/2024"
```

**Response** `200 OK`
```json
[
  {
    "id": "prop-123",
    "name": "Luxury Apartment Bogota",
    "maxCapacity": 4,
    "description": "Beautiful apartment in the north of the city.",
    "photos": ["https://assets.travelhub.com/prop123/1.jpg"],
    "checkInTime": "15:00:00",
    "checkOutTime": "11:00:00",
    "adminGroupId": "hotel-admin-group-001"
  }
]
```

---

### Get Property Details

```
GET /api/property/{id}
```

Returns full details for a specific property, including amenities and reviews.

**Path Variables**

| Variable | Description         |
|----------|---------------------|
| id       | Unique property ID  |

#### Example

**Request**
```bash
curl -X GET https://{api-gateway-url}/property/api/property/prop-123
```

**Response** `200 OK`
```json
{
  "id": "prop-123",
  "name": "Luxury Apartment Bogota",
  "maxCapacity": 4,
  "description": "Beautiful apartment in the north of the city.",
  "photos": ["https://assets.travelhub.com/prop123/1.jpg"],
  "checkInTime": "15:00:00",
  "checkOutTime": "11:00:00",
  "adminGroupId": "hotel-admin-group-001",
  "reviews": [
    {
      "id": "rev-456",
      "description": "Excellent stay!",
      "rating": 5,
      "name": "Juan Perez"
    }
  ],
  "amenities": [
    {
      "id": "am-1",
      "description": "WiFi"
    },
    {
      "id": "am-2",
      "description": "Pool"
    }
  ]
}
```

---

### Lock Property (Internal/Booking)

```
POST /api/property/lock
```

Locks a property for a specific date range to prevent double bookings.

**Request Body**

| Field            | Type   | Required | Description                          |
|------------------|--------|----------|--------------------------------------|
| propertyDetailId | string | Yes      | ID of the property to lock           |
| startDate        | string | Yes      | Format: `dd/MM/yyyy`                 |
| endDate          | string | Yes      | Format: `dd/MM/yyyy`                 |

#### Example

**Request**
```bash
curl -X POST https://{api-gateway-url}/property/api/property/lock \
  -H 'Content-Type: application/json' \
  -d '{
    "propertyDetailId": "prop-123",
    "startDate": "01/12/2024",
    "endDate": "05/12/2024"
  }'
```

**Response** `204 No Content`

---

### Error Responses

| Status | Condition                         | Example Response                                           |
|--------|-----------------------------------|------------------------------------------------------------|
| 400    | Validation error / Date conflict  | `{"error": "Invalid input data. Errors -> [...]", "date": "..."}` |
| 404    | Property not found                | `{"error": "The property with id ... could not be found.", "date": "..."}` |
| 500    | Unexpected server error           | `{"error": "Unexpected error, check logs.", "date": "..."}` |

---

## Technical Stack

- **Runtime:** Java 25 (Eclipse Temurin)
- **Framework:** Spring Boot 4.0.3
- **Database:** PostgreSQL
- **Persistence:** Spring Data JPA / Hibernate
- **Monitoring:** Spring Boot Actuator + Prometheus

## Local Development

```bash
# Build the project
./mvnw clean compile

# Run tests
./mvnw test

# Run locally
./mvnw spring-boot:run
```

### Environment Variables

| Variable          | Description                    | Default         |
|-------------------|--------------------------------|-----------------|
| DB_HOST           | Database hostname              | localhost       |
| DB_NAME           | Database name                  | postgres        |
| DB_USERNAME       | Database user                  | postgres        |
| DB_PASSWORD       | Database password              | 123456          |
| JPA_DDL_AUTO      | Hibernate DDL strategy         | none            |
| JPA_SHOW_SQL      | Log SQL queries                | false           |
