import os
from enum import Enum

import boto3
from botocore.exceptions import ClientError
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr

app = FastAPI(title="Auth Microservice")

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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=80)
