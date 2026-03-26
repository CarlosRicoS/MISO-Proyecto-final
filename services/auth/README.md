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

### Login

```
POST /api/auth/login
```

Authenticates a user and returns JWT tokens. Users can log in immediately after registration (no email verification required).

**Request Body**

| Field    | Type   | Required | Description              |
|----------|--------|----------|--------------------------|
| email    | string | Yes      | Registered email address |
| password | string | Yes      | User's password          |

#### Example

**Request**
```bash
curl -X POST https://{api-gateway-url}/auth/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "juan@example.com",
    "password": "MyPass123"
  }'
```

**Response** `200 OK`
```json
{
  "id_token": "eyJhbGciOi...",
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJjdHkiOi...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

---

### Get Current User (Token Verification)

```
GET /api/auth/me
```

Validates the access token and returns the authenticated user's information, including their role.

**Headers**

| Header         | Value                        | Required |
|----------------|------------------------------|----------|
| Authorization  | Bearer {access_token}        | Yes      |

#### Example

**Request**
```bash
curl https://{api-gateway-url}/auth/api/auth/me \
  -H 'Authorization: Bearer eyJhbGciOi...'
```

**Response** `200 OK`
```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "juan@example.com",
  "email_verified": true,
  "role": "travelers"
}
```

---

### Error Responses

| Status | Condition                         | Example Response                                                 |
|--------|-----------------------------------|------------------------------------------------------------------|
| 400    | Invalid password                  | `{"detail": "Password did not conform with policy: ..."}` |
| 401    | Invalid login credentials         | `{"detail": "Invalid credentials"}`                              |
| 401    | Missing or invalid token          | `{"detail": "Missing or invalid token"}`                         |
| 401    | Expired or invalid token          | `{"detail": "Token expired or invalid"}`                         |
| 409    | Email already registered          | `{"detail": "Email already in use"}`                             |
| 422    | Invalid role or missing fields    | `{"detail": [{"msg": "Input should be 'travelers' or 'hotel-admins'", ...}]}` |
| 500    | User created but group assignment failed | `{"detail": "User created but failed to assign group: ..."}` |

---

## Authentication Flow

1. **Register** the user via `POST /api/auth/register` (users are auto-confirmed, no email verification needed)
2. **Sign in** via `POST /api/auth/login` to get `id_token`, `access_token`, and `refresh_token`
3. **Send the id_token** as `Authorization: Bearer <id_token>` on all subsequent API requests to protected services
4. **Verify the token** via `GET /api/auth/me` to get user info and role (uses the `access_token`)

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
