import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio
import os
from email.utils import formataddr



from app.settings import EMAIL_USER, EMAIL_PASS, SMTP_SERVER, SMTP_PORT

EMAIL = EMAIL_USER
PASSWORD = EMAIL_PASS

# ---------- TEMPLATES (professional, generic) ----------

def template_security(name, link):
    return f"""
    <html>
    <body style="margin:0;background:#f2f2f2;font-family:Arial;">
      <div style="max-width:600px;margin:40px auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
        <div style="background:#1a73e8;color:white;padding:15px;font-size:18px;">Security Alert</div>
        <div style="padding:20px;">
          <p>Hi {name},</p>
          <p>We detected a sign-in from a new device. If this wasn't you, please review your account.</p>
          <div style="text-align:center;margin:30px;">
            <a href="{link}" style="background:#1a73e8;color:white;padding:12px 25px;text-decoration:none;border-radius:5px;font-weight:bold;">
              Review Activity
            </a>
          </div>
          <p style="font-size:13px;color:#666;">This link expires in 24 hours.</p>
        </div>
        <div style="background:#f5f5f5;padding:15px;font-size:12px;color:#888;text-align:center;">
          Internal Security Awareness Exercise
        </div>
      </div>
    </body>
    </html>
    """

def template_reset(name, link):
    return f"""
    <html>
    <body style="margin:0;background:#f4f6f8;font-family:Arial;">
      <div style="max-width:600px;margin:40px auto;background:white;padding:30px;border-radius:8px;">
        <h2 style="color:#333;">Reset Your Password</h2>
        <p>Hello {name},</p>
        <p>We received a request to reset your password.</p>
        <div style="text-align:center;margin:30px;">
          <a href="{link}" style="background:#2d89ef;color:white;padding:12px 25px;text-decoration:none;border-radius:5px;">
            Reset Password
          </a>
        </div>
        <p style="font-size:13px;color:#777;">If you didn’t request this, ignore this email.</p>
      </div>
    </body>
    </html>
    """

def template_suspension(name, link):
    return f"""
    <html>
    <body style="margin:0;background:#fff3f3;font-family:Arial;">
      <div style="max-width:600px;margin:40px auto;background:white;border:1px solid #ff4d4f;border-radius:8px;">
        <div style="background:#ff4d4f;color:white;padding:15px;font-size:18px;">Account Notice</div>
        <div style="padding:20px;">
          <p>Dear {name},</p>
          <p>Your account requires verification to avoid interruption.</p>
          <div style="text-align:center;margin:30px;">
            <a href="{link}" style="background:#ff4d4f;color:white;padding:12px 25px;text-decoration:none;border-radius:5px;">
              Verify Account
            </a>
          </div>
          <p style="font-size:13px;color:#999;">Internal training message.</p>
        </div>
      </div>
    </body>
    </html>
    """

def get_template(template_id, name, link):
    return {
        "security": template_security,
        "reset": template_reset,
        "suspension": template_suspension,
    }.get(template_id, template_security)(name, link)

# ---------- SEND (sync + async wrapper) ----------

def send_email(to_email, subject, html_content):
    msg = MIMEMultipart()
    msg["From"] = formataddr(("RoblockSec", EMAIL or "mock@simulation.local"))
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_content, "html"))

    try:
        if not EMAIL or not PASSWORD:
            raise smtplib.SMTPException("SMTP credentials not configured. Falling back to mock delivery.")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL, PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"[+] Phishing email successfully sent to {to_email} via SMTP.")
    except Exception as e:
        print(f"[!] SMTP Delivery failed for {to_email}: {e}")
        print("[-] FALLBACK: Mock-delivering email. See details below:")
        print(f"    To: {to_email}")
        print(f"    Subject: {subject}")
        # Find click link in html content to make testing/clicks easy
        import re
        links = re.findall(r'href=["\'](http[s]?://[^"\']+)["\']', html_content)
        if links:
            print(f"    Simulation Click Link: {links[0]}")
        else:
            print("    No links found in HTML content.")

async def send_email_async(to_email, subject, html_content):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, send_email, to_email, subject, html_content)