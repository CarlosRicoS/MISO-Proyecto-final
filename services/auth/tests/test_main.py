import os

import boto3
import pytest
from moto import mock_aws
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def cognito_setup():
    with mock_aws():
        client = boto3.client("cognito-idp", region_name="us-east-1")

        pool = client.create_user_pool(
            PoolName="test-pool",
            Policies={
                "PasswordPolicy": {
                    "MinimumLength": 8,
                    "RequireUppercase": True,
                    "RequireLowercase": True,
                    "RequireNumbers": True,
                    "RequireSymbols": False,
                }
            },
            UsernameAttributes=["email"],
            AutoVerifiedAttributes=["email"],
            Schema=[
                {
                    "Name": "email",
                    "AttributeDataType": "String",
                    "Required": True,
                    "Mutable": True,
                },
                {
                    "Name": "name",
                    "AttributeDataType": "String",
                    "Required": True,
                    "Mutable": True,
                },
            ],
        )
        pool_id = pool["UserPool"]["Id"]

        app_client = client.create_user_pool_client(
            UserPoolId=pool_id,
            ClientName="test-client",
            GenerateSecret=False,
            ExplicitAuthFlows=[
                "ALLOW_USER_SRP_AUTH",
                "ALLOW_REFRESH_TOKEN_AUTH",
                "ALLOW_USER_PASSWORD_AUTH",
            ],
        )
        client_id = app_client["UserPoolClient"]["ClientId"]

        client.create_group(
            GroupName="travelers",
            UserPoolId=pool_id,
            Description="Travelers group",
        )
        client.create_group(
            GroupName="hotel-admins",
            UserPoolId=pool_id,
            Description="Hotel admins group",
        )

        os.environ["COGNITO_USER_POOL_ID"] = pool_id
        os.environ["COGNITO_CLIENT_ID"] = client_id
        os.environ["AWS_REGION"] = "us-east-1"
        os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
        os.environ["ALLOWED_ROLES"] = "travelers,hotel-admins"

        # Import app after env vars are set
        from main import app

        test_client = TestClient(app)
        yield test_client, client, pool_id


def test_health_check(cognito_setup):
    client, _, _ = cognito_setup
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "auth"


def test_register_traveler(cognito_setup):
    client, cognito_client, pool_id = cognito_setup
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "John Doe",
            "email": "john@example.com",
            "password": "Test1234",
            "role": "travelers",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "john@example.com"
    assert data["role"] == "travelers"
    assert data["message"] == "User registered successfully"


def test_register_hotel_admin(cognito_setup):
    client, _, _ = cognito_setup
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Admin User",
            "email": "admin@hotel.com",
            "password": "Admin1234",
            "role": "hotel-admins",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "hotel-admins"


def test_register_duplicate_email(cognito_setup):
    client, _, _ = cognito_setup
    # First registration
    client.post(
        "/api/auth/register",
        json={
            "full_name": "First User",
            "email": "duplicate@example.com",
            "password": "Test1234",
            "role": "travelers",
        },
    )
    # Second registration with same email
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Second User",
            "email": "duplicate@example.com",
            "password": "Test1234",
            "role": "travelers",
        },
    )
    assert response.status_code == 409
    assert "Email already in use" in response.json()["detail"]


def test_register_invalid_password(cognito_setup):
    client, _, _ = cognito_setup
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Weak Pass",
            "email": "weak@example.com",
            "password": "short",
            "role": "travelers",
        },
    )
    assert response.status_code == 400


def test_register_invalid_role(cognito_setup):
    client, _, _ = cognito_setup
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Bad Role",
            "email": "badrole@example.com",
            "password": "Test1234",
            "role": "superadmin",
        },
    )
    assert response.status_code == 422  # Pydantic validation error for invalid enum


def test_register_auto_confirms_user(cognito_setup):
    client, cognito_client, pool_id = cognito_setup
    client.post(
        "/api/auth/register",
        json={
            "full_name": "Confirmed User",
            "email": "confirmed@example.com",
            "password": "Test1234",
            "role": "travelers",
        },
    )
    user = cognito_client.admin_get_user(
        UserPoolId=pool_id,
        Username="confirmed@example.com",
    )
    assert user["UserStatus"] == "CONFIRMED"


def test_login_success(cognito_setup):
    client, _, _ = cognito_setup
    client.post(
        "/api/auth/register",
        json={
            "full_name": "Login User",
            "email": "login@example.com",
            "password": "Test1234",
            "role": "travelers",
        },
    )
    response = client.post(
        "/api/auth/login",
        json={
            "email": "login@example.com",
            "password": "Test1234",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "id_token" in data
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "Bearer"
    assert data["expires_in"] > 0


def test_login_wrong_password(cognito_setup):
    client, _, _ = cognito_setup
    client.post(
        "/api/auth/register",
        json={
            "full_name": "Wrong Pass",
            "email": "wrongpass@example.com",
            "password": "Test1234",
            "role": "travelers",
        },
    )
    response = client.post(
        "/api/auth/login",
        json={
            "email": "wrongpass@example.com",
            "password": "WrongPassword1",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_nonexistent_user(cognito_setup):
    client, _, _ = cognito_setup
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nobody@example.com",
            "password": "Test1234",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_get_current_user_success(cognito_setup):
    client, _, _ = cognito_setup
    client.post(
        "/api/auth/register",
        json={
            "full_name": "Me User",
            "email": "meuser@example.com",
            "password": "Test1234",
            "role": "hotel-admins",
        },
    )
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": "meuser@example.com",
            "password": "Test1234",
        },
    )
    access_token = login_response.json()["access_token"]
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "meuser@example.com"
    assert "user_id" in data
    assert "email_verified" in data
    assert data["role"] == "hotel-admins"


def test_get_current_user_invalid_token(cognito_setup):
    client, _, _ = cognito_setup
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token-here"},
    )
    assert response.status_code == 401


def test_get_current_user_no_token(cognito_setup):
    client, _, _ = cognito_setup
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing or invalid token"
