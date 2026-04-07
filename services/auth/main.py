import os
from enum import Enum

import boto3
from botocore.exceptions import ClientError
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

app = FastAPI(title="Auth Microservice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")
COGNITO_CLIENT_ID = os.getenv("COGNITO_CLIENT_ID", "")
ALLOWED_ROLES = os.getenv("ALLOWED_ROLES", "travelers,hotel-admins").split(",")


def get_cognito_client():
    return boto3.client("cognito-idp", region_name=AWS_REGION)


class Role(str, Enum):
    TRAVELERS = "travelers"
    HOTEL_ADMINS = "hotel-admins"


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Role


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "auth"}


@app.post("/api/auth/register", status_code=201)
async def register(request: RegisterRequest):
    if request.role.value not in ALLOWED_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")

    client = get_cognito_client()

    try:
        client.sign_up(
            ClientId=COGNITO_CLIENT_ID,
            Username=request.email,
            Password=request.password,
            UserAttributes=[
                {"Name": "email", "Value": request.email},
                {"Name": "name", "Value": request.full_name},
            ],
        )
    except ClientError as e:
        code = e.response["Error"]["Code"]
        message = e.response["Error"]["Message"]
        if code == "UsernameExistsException":
            raise HTTPException(status_code=409, detail="Email already in use")
        if code == "InvalidPasswordException":
            raise HTTPException(status_code=400, detail=message)
        raise HTTPException(status_code=400, detail=message)

    try:
        client.admin_confirm_sign_up(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=request.email,
        )
    except ClientError as e:
        raise HTTPException(
            status_code=500,
            detail=f"User created but confirmation failed: {e.response['Error']['Message']}",
        )

    try:
        client.admin_add_user_to_group(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=request.email,
            GroupName=request.role.value,
        )
    except ClientError as e:
        raise HTTPException(
            status_code=500,
            detail=f"User created but failed to assign group: {e.response['Error']['Message']}",
        )

    return {
        "message": "User registered successfully",
        "email": request.email,
        "role": request.role.value,
    }


@app.post("/api/auth/login")
async def login(request: LoginRequest):
    client = get_cognito_client()

    try:
        response = client.initiate_auth(
            ClientId=COGNITO_CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": request.email,
                "PASSWORD": request.password,
            },
        )
    except ClientError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    auth_result = response.get("AuthenticationResult")
    if not auth_result:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "id_token": auth_result["IdToken"],
        "access_token": auth_result["AccessToken"],
        "refresh_token": auth_result.get("RefreshToken", ""),
        "expires_in": auth_result.get("ExpiresIn", 3600),
        "token_type": "Bearer",
    }


@app.get("/api/auth/me")
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split(" ", 1)[1]
    client = get_cognito_client()

    try:
        response = client.get_user(AccessToken=token)
    except ClientError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    attributes = {
        attr["Name"]: attr["Value"]
        for attr in response.get("UserAttributes", [])
    }

    username = response.get("Username", "")

    try:
        groups_response = client.admin_list_groups_for_user(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=username,
        )
        groups = groups_response.get("Groups", [])
        role = groups[0]["GroupName"] if groups else None
    except ClientError:
        role = None

    return {
        "user_id": attributes.get("sub", ""),
        "email": attributes.get("email", ""),
        "email_verified": attributes.get("email_verified", "false") == "true",
        "role": role,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=80)
