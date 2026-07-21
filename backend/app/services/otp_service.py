import random
import time
import os
import requests
from app.services.email_service import send_email_async

# In-memory store for OTPs: { identifier: {"code": str, "expires_at": float} }
_otp_store = {}

def generate_otp(identifier: str) -> str:
    """Generates a 6-digit OTP, stores it with a 5-minute expiration, and returns it."""
    otp = f"{random.randint(100000, 999999)}"
    _otp_store[identifier] = {
        "code": otp,
        "expires_at": time.time() + 300  # 5 minutes expiry
    }
    return otp

def verify_otp(identifier: str, code: str) -> bool:
    """Verifies the code for a given identifier (email or phone)."""
    if identifier not in _otp_store:
        return False
    
    record = _otp_store[identifier]
    if time.time() > record["expires_at"]:
        del _otp_store[identifier]
        return False
        
    if record["code"] == code:
        del _otp_store[identifier]
        return True
        
    return False

async def send_email_otp(email: str) -> str:
    """Generates and sends an OTP to the given email address."""
    otp = generate_otp(email)
    print(f"\n[OTP SERVICE] Generated Email OTP for {email}: {otp}\n")
    
    html_content = f"""
    <html>
    <body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;">
      <div style="max-width:500px;margin:40px auto;background:white;padding:30px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.05);border:1px solid #e1e8ed;">
        <h2 style="color:#1a1f36;margin-bottom:6px;font-weight:700;">Verify Your Email Address</h2>
        <p style="color:#4f566b;font-size:14px;line-height:22px;">Use the verification code below to complete your registration with Breach Simu.</p>
        <div style="background:#f8f9fa;border-radius:8px;padding:20px;text-align:center;margin:24px 0;border:1px dashed #cfd7df;">
          <span style="font-size:32px;font-weight:800;letter-spacing:6px;color:#635bff;font-family:monospace;">{otp}</span>
        </div>
        <p style="font-size:12px;color:#8898aa;margin-top:20px;line-height:18px;">This code is valid for 5 minutes. If you did not request this code, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
    """
    
    try:
        await send_email_async(email, "Breach Simu - Verification Code", html_content)
    except Exception as e:
        print(f"[OTP SERVICE] SMTP delivery failed: {e}")
        
    return otp

def send_phone_otp(phone_number: str) -> str:
    """Generates and sends a real Twilio SMS OTP to the given phone number."""
    otp = generate_otp(phone_number)
    
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_number = os.getenv("TWILIO_PHONE_NUMBER")

    # If keys are missing, raise ValueError so router handles it cleanly
    if not account_sid or not auth_token or not twilio_number:
        raise ValueError(
            "Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) "
            "are not configured in your backend/.env file. Please add them to enable real SMS OTPs."
        )

    # Dispatches the real Twilio request
    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    data = {
        "From": twilio_number,
        "To": phone_number,
        "Body": f"Your Breach Simu verification code is: {otp}"
    }

    try:
        response = requests.post(url, data=data, auth=(account_sid, auth_token))
        if response.status_code not in (200, 201):
            error_data = response.json()
            error_msg = error_data.get("message", "Unknown Twilio API failure")
            raise RuntimeError(f"Twilio API Error: {error_msg}")
    except Exception as e:
        print(f"[OTP SERVICE] Twilio request failed: {e}")
        raise RuntimeError(f"Failed to send SMS via Twilio: {str(e)}")

    print(f"\n[OTP SERVICE] Real SMS OTP dispatched to {phone_number}\n")
    return otp
