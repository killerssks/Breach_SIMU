from collections import defaultdict
import socket

from fastapi import APIRouter, Depends
import psutil
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.models.event import Event
from app.models.organization import Organization
from app.core.dependencies import get_current_organization, get_db


from app.websocket.manager import manager

router = APIRouter()


@router.get("/summary")
def get_summary(campaign_ids: str = None, current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    try:
        # Query active and latest campaigns
        active_campaign = db.query(Campaign).filter(Campaign.organization_id == current_org.id, Campaign.status == "active").first()
        latest_campaign = db.query(Campaign).filter(Campaign.organization_id == current_org.id).order_by(Campaign.created_at.desc()).first()
        
        active_campaign_name = active_campaign.name if active_campaign else None
        latest_campaign_name = latest_campaign.name if latest_campaign else "None"
        
        # 🟢 Resolve campaigns to query phishing stats
        if campaign_ids == "all":
            campaigns = db.query(Campaign).filter(Campaign.organization_id == current_org.id).all()
        elif campaign_ids:
            try:
                ids = [int(x.strip()) for x in campaign_ids.split(",") if x.strip()]
                campaigns = db.query(Campaign).filter(Campaign.id.in_(ids), Campaign.organization_id == current_org.id).all()
            except ValueError:
                campaigns = []
        else:
            campaigns = [active_campaign] if active_campaign else ([latest_campaign] if latest_campaign else [])

        total_campaigns = db.query(Campaign).filter(Campaign.organization_id == current_org.id).count()
        phishing_campaigns = db.query(Campaign).filter(Campaign.organization_id == current_org.id, Campaign.type == "phishing").count()

        if campaigns:
            campaign_ids_list = [c.id for c in campaigns]
            phishing_stats = {
                "sent": db.query(Event).filter(Event.organization_id == current_org.id, Event.campaign_id.in_(campaign_ids_list), Event.event_type == "sent").count(),
                "opened": db.query(Event).filter(Event.organization_id == current_org.id, Event.campaign_id.in_(campaign_ids_list), Event.event_type == "opened").count(),
                "clicked": db.query(Event).filter(Event.organization_id == current_org.id, Event.campaign_id.in_(campaign_ids_list), Event.event_type == "clicked").count(),
                "submitted": db.query(Event).filter(Event.organization_id == current_org.id, Event.campaign_id.in_(campaign_ids_list), Event.event_type == "submitted").count(),
            }
            db_events = db.query(Event).filter(Event.organization_id == current_org.id, Event.campaign_id.in_(campaign_ids_list)).order_by(Event.timestamp.desc()).limit(15).all()
        else:
            phishing_stats = {
                "sent": 0,
                "opened": 0,
                "clicked": 0,
                "submitted": 0,
            }
            db_events = []

        total_phishing_events = phishing_stats["sent"] + phishing_stats["opened"] + phishing_stats["submitted"]

        db_logs = []
        for e in db_events:
            user_lbl = f" by {e.user_email}" if e.user_email else ""
            if e.event_type == "sent":
                db_logs.append(f"[PHISHING] Email sent{user_lbl}")
            elif e.event_type == "opened":
                db_logs.append(f"[PHISHING] Email opened{user_lbl}")
            elif e.event_type == "clicked":
                db_logs.append(f"[PHISHING] Link clicked{user_lbl}")
            elif e.event_type == "submitted":
                db_logs.append(f"[CRITICAL] Credentials captured{user_lbl}!")

        # 🟢 Merge database logs and WebSocket in-memory history logs
        merged_logs = manager.log_history.copy()
        for log in db_logs:
            if log not in merged_logs:
                merged_logs.append(log)

        return {
            "total_campaigns": total_campaigns,
            "total_events": total_phishing_events + manager.sandbox_events_count + manager.bruteforce_events_count + getattr(manager, "scanner_events_count", 0),
            "phishing_campaigns": phishing_campaigns,
            "phishing_stats": phishing_stats,
            "sandbox_events": manager.sandbox_events_count,
            "bruteforce_events": manager.bruteforce_events_count,
            "ddos_packets": manager.ddos_packets_count,
            "scanner_events": getattr(manager, "scanner_events_count", 0),
            "active_campaign": active_campaign_name,
            "latest_campaign": latest_campaign_name,
            "last_detonated_file": manager.last_detonated_file,
            "live_logs": merged_logs[:30]
        }
    except Exception as e:
        print(f"[!] summary endpoint error: {e}")
        return {
            "total_campaigns": 0,
            "total_events": 0,
            "phishing_campaigns": 0,
            "phishing_stats": {"opened": 0, "clicked": 0, "submitted": 0},
            "sandbox_events": 0,
            "bruteforce_events": 0,
            "ddos_packets": 0,
            "scanner_events": 0,
            "active_campaign": None,
            "latest_campaign": "None",
            "last_detonated_file": "None",
            "live_logs": []
        }


@router.get("/timeline")
def get_timeline(current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    try:
        rows = (
            db.query(func.date(Event.timestamp), func.count(Event.id))
            .filter(Event.organization_id == current_org.id)
            .group_by(func.date(Event.timestamp))
            .order_by(func.date(Event.timestamp))
            .all()
        )

        return {str(day): count for day, count in rows if day is not None}
    except Exception as e:
        pass


@router.get("/campaigns")
def get_campaigns(current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    try:
        campaigns = db.query(Campaign).filter(Campaign.organization_id == current_org.id).order_by(Campaign.created_at.desc()).all()

        return [
            {
                "id": campaign.id,
                "name": campaign.name,
                "type": campaign.type,
                "status": campaign.status,
                "subject": campaign.subject,
                "template": campaign.template,
                "created_at": str(campaign.created_at),
            }
            for campaign in campaigns
        ]
    except Exception as e:
        pass


from app.models.credential import Credential

@router.get("/phishing/{campaign_id}/details")
def get_phishing_details(campaign_id: str, current_org: Organization = Depends(get_current_organization), db: Session = Depends(get_db)):
    try:
        from app.models.campaign import Campaign
        if campaign_id == "all":
            campaigns = db.query(Campaign).filter(Campaign.organization_id == current_org.id).all()
        else:
            try:
                ids = [int(x.strip()) for x in campaign_id.split(",") if x.strip()]
                campaigns = db.query(Campaign).filter(Campaign.id.in_(ids), Campaign.organization_id == current_org.id).all()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid campaign ID list format.")

        if not campaigns:
            return []

        campaign_ids = [c.id for c in campaigns]

        events = (
            db.query(Event)
            .filter(Event.campaign_id.in_(campaign_ids), Event.organization_id == current_org.id)
            .order_by(Event.timestamp.asc())
            .all()
        )

        creds = (
            db.query(Credential)
            .filter(Credential.campaign_id.in_(campaign_ids), Credential.organization_id == current_org.id)
            .all()
        )
        cred_map = {c.user_email: c.captured_data for c in creds if c.user_email}

        users = defaultdict(lambda: {
            "email": "",
            "sent": False,
            "opened": False,
            "clicked": False,
            "submitted": False,
            "password": "",
            "capturedUsername": "",
        })

        for event in events:
            email = event.user_email or "unknown"
            user_state = users[email]
            user_state["email"] = email
            user_state["password"] = cred_map.get(email, "")

            if event.event_type == "sent":
                user_state["sent"] = True
            elif event.event_type == "opened":
                user_state["opened"] = True
            elif event.event_type == "clicked":
                user_state["clicked"] = True
            elif event.event_type == "submitted":
                user_state["submitted"] = True
                user_state["capturedUsername"] = email

        return list(users.values())
    except Exception as e:
        pass


@router.get("/interfaces")
def get_interfaces():
    interfaces = []
    addrs = psutil.net_if_addrs()

    for name, addr_list in addrs.items():
        for addr in addr_list:
            if addr.family == socket.AF_INET:
                interfaces.append({
                    "name": name,
                    "ip": addr.address
                })

    return interfaces
