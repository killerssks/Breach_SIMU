from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from app.models.organization import Organization
from app.schemas.auth import OrganizationCreate, OrganizationResponse, Token, OrganizationUpdate
from app.core.security import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.dependencies import get_db, get_current_organization
from datetime import timedelta
import re
from pydantic import BaseModel
from app.services.otp_service import send_email_otp, send_phone_otp, verify_otp

router = APIRouter(tags=["Authentication"])

class EmailOtpRequest(BaseModel):
    email: str

class PhoneOtpRequest(BaseModel):
    phone_number: str

# Helper to validate Gmail
def validate_gmail(email: str):
    # Matches alphanumeric, dot, underscore, plus, minus before @gmail.com
    pattern = re.compile(r"^[a-zA-Z0-9_.+-]+@gmail\.com$", re.IGNORECASE)
    if not pattern.match(email):
        raise HTTPException(
            status_code=400,
            detail="Only Gmail addresses (@gmail.com) are allowed."
        )

# Helper to validate strong password
def validate_password_strength(password: str):
    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long."
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter."
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one lowercase letter."
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one digit."
        )
    if not re.search(r"[@$!%*?&#_]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one special character (@, $, !, %, *, ?, &, #, _, etc.)."
        )

@router.post("/send-email-otp")
async def request_email_otp(req: EmailOtpRequest):
    validate_gmail(req.email)
    otp = await send_email_otp(req.email)
    return {"message": "OTP sent to email", "mock_otp": otp}

@router.post("/send-phone-otp")
async def request_phone_otp(req: PhoneOtpRequest):
    if not req.phone_number or len(req.phone_number) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number format.")
    otp = send_phone_otp(req.phone_number)
    return {"message": "OTP sent to phone (mocked in console)", "mock_otp": otp}

def validate_email_format(email: str):
    pattern = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    if not pattern.match(email):
        raise HTTPException(
            status_code=400,
            detail="Invalid email format."
        )

@router.post("/register", response_model=OrganizationResponse)
def register_organization(org_in: OrganizationCreate, db: Session = Depends(get_db)):
    # 1. Email Validation
    validate_email_format(org_in.email)

    # 2. Check if already registered
    db_org = db.query(Organization).filter(Organization.email == org_in.email).first()
    if db_org:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    org_name = org_in.name or org_in.email
    db_org_name = db.query(Organization).filter(Organization.name == org_name).first()
    if db_org_name:
        raise HTTPException(status_code=400, detail="Organization name already taken")

    # 3. OTP Verifications (Optional/Bypassed if not provided)
    if org_in.email_otp and not verify_otp(org_in.email, org_in.email_otp):
        raise HTTPException(status_code=400, detail="Invalid or expired email verification OTP")
    
    if org_in.phone_otp and org_in.phone_number and not verify_otp(org_in.phone_number, org_in.phone_otp):
        raise HTTPException(status_code=400, detail="Invalid or expired phone verification OTP")

    # 4. Password Strength Validation
    validate_password_strength(org_in.password)
    
    # 5. Create Organization
    hashed_password = get_password_hash(org_in.password)
    new_org = Organization(
        name=org_name,
        email=org_in.email,
        hashed_password=hashed_password,
        first_name=org_in.first_name,
        last_name=org_in.last_name,
        phone_number=org_in.phone_number,
        is_email_verified=True,
        is_phone_verified=True
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    return new_org

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.email == form_data.username).first()
    if not org or not verify_password(form_data.password, org.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": org.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=OrganizationResponse)
def get_me(current_org: Organization = Depends(get_current_organization)):
    return current_org

@router.put("/update", response_model=OrganizationResponse)
def update_organization(
    org_update: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_org: Organization = Depends(get_current_organization)
):
    if org_update.name is not None and org_update.name.strip() != "":
        # Check if name is taken by another org
        existing = db.query(Organization).filter(
            Organization.name == org_update.name.strip(),
            Organization.id != current_org.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Organization/Company name already taken")
        current_org.name = org_update.name.strip()
    
    if org_update.first_name is not None:
        current_org.first_name = org_update.first_name.strip()
        
    if org_update.last_name is not None:
        current_org.last_name = org_update.last_name.strip()
        
    if org_update.phone_number is not None:
        current_org.phone_number = org_update.phone_number.strip()
        
    db.commit()
    db.refresh(current_org)
    return current_org
