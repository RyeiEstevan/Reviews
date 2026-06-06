from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str  # accepts either the username or the email
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
