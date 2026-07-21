from pydantic import BaseModel
from typing import Optional

class OrganizationCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    email_otp: Optional[str] = None
    phone_otp: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None

class OrganizationResponse(BaseModel):
    id: int
    name: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
