# Auth Microservice

Authentication and user registration service for TravelHub, backed by AWS Cognito.

## Base URL

**Production:** `https://{api-gateway-url}/auth`

## Endpoints

### Health Check

```
GET /api/health
```

**Response** `200 OK`
```json
{
  "status": "ok",
  "service": "auth"
}
```

---

### Register User

```
POST /api/auth/register
```

Creates a new user in AWS Cognito and assigns them to the specified role group.

**Headers**

| Header         | Value              | Required |
|----------------|--------------------|----------|
| Content-Type   | application/json   | Yes      |

**Request Body**

| Field       | Type   | Required | Description                                    |
|-------------|--------|----------|------------------------------------------------|
| full_name   | string | Yes      | User's full name                               |
| email       | string | Yes      | Valid email address (used as username)          |
| password    | string | Yes      | Must meet password policy (see below)          |
| role        | string | Yes      | One of: `travelers`, `hotel-admins`             |

**Password Policy**

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- Symbols are optional

**Roles**

| Role           | Description                          |
|----------------|--------------------------------------|
| `travelers`    | Registered travelers searching and booking properties |
| `hotel-admins` | Hotel administrators managing property listings       |

---

#### Example: Register a traveler

**Request**
```bash
curl -X POST https://{api-gateway-url}/auth/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "full_name": "Juan Perez",
    "email": "juan@example.com",
    "password": "MyPass123",
    "role": "travelers"
  }'
```

**Response** `201 Created`
```json
{
  "message": "User registered successfully",
  "email": "juan@example.com",
  "role": "travelers"
}
```

#### Example: Register a hotel admin

**Request**
```bash
curl -X POST https://{api-gateway-url}/auth/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "full_name": "Maria Garcia",
    "email": "maria@hotel.com",
    "password": "Admin1234",
    "role": "hotel-admins"
  }'
```

**Response** `201 Created`
```json
{
  "message": "User registered successfully",
  "email": "maria@hotel.com",
  "role": "hotel-admins"
}
```

---

### Error Responses

| Status | Condition                         | Example Response                                                 |
|--------|-----------------------------------|------------------------------------------------------------------|
| 400    | Invalid password                  | `{"detail": "Password did not conform with policy: ..."}` |
| 409    | Email already registered          | `{"detail": "Email already in use"}`                             |
| 422    | Invalid role or missing fields    | `{"detail": [{"msg": "Input should be 'travelers' or 'hotel-admins'", ...}]}` |
| 500    | User created but group assignment failed | `{"detail": "User created but failed to assign group: ..."}` |

---

## Authentication Flow

After registration, the frontend should use AWS Cognito's `InitiateAuth` API to obtain JWT tokens:

1. **Register** the user via `POST /api/auth/register` (this service)
2. **Confirm** the user's email (Cognito sends a verification code)
3. **Sign in** using Cognito's `USER_PASSWORD_AUTH` flow to get `IdToken`, `AccessToken`, and `RefreshToken`
4. **Send the IdToken** as `Authorization: Bearer <IdToken>` on all subsequent API requests

Protected endpoints (all services except `/auth/*`) require a valid JWT. The API Gateway validates the token and injects these headers to backend services:

| Header         | Source                          | Description                |
|----------------|---------------------------------|----------------------------|
| X-User-Id      | `sub` claim from JWT            | Cognito user UUID          |
| X-User-Email   | `email` claim from JWT          | User's email address       |

### Cognito Configuration

| Parameter         | Value                                      |
|-------------------|--------------------------------------------|
| User Pool ID      | Stored in SSM: `/final-project-miso/cognito/user_pool_id` |
| App Client ID     | Stored in SSM: `/final-project-miso/cognito/app_client_id` |
| Region            | `us-east-1`                                |
| Issuer URL        | Stored in SSM: `/final-project-miso/cognito/issuer_url`   |

---

## Local Development

```bash
# Install dependencies
uv sync --group dev

# Run locally
uv run uvicorn main:app --reload --port 80

# Run tests
uv run pytest tests/ -v
```

### Environment Variables

| Variable              | Description                    | Default                    |
|-----------------------|--------------------------------|----------------------------|
| COGNITO_USER_POOL_ID  | Cognito User Pool ID           | (empty)                    |
| COGNITO_CLIENT_ID     | Cognito App Client ID          | (empty)                    |
| AWS_REGION            | AWS region                     | us-east-1                  |
| ALLOWED_ROLES         | Comma-separated allowed roles  | travelers,hotel-admins     |

For local testing with mocked Cognito, the test suite uses [moto](https://github.com/getmoto/moto) — no real AWS credentials needed.
