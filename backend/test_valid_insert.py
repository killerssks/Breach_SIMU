import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.campaign import Campaign
from app.models.event import Event
from app.models.credential import Credential
from app.models.organization import Organization
from app.models.user import User

db = SessionLocal()
try:
    # Query an existing campaign
    campaign = db.query(Campaign).first()
    if not campaign:
        print("[-] No campaigns in database. Please run check_events.py first.")
        sys.exit(1)
        
    print(f"[+] Using Campaign ID: {campaign.id}, Org ID: {campaign.organization_id}")
    
    event = Event(
        campaign_id=campaign.id, 
        organization_id=campaign.organization_id, 
        user_email="krishnatulasi.645@gmail.com", 
        event_type="sent", 
        ip_address="local"
    )
    db.add(event)
    db.commit()
    print("[+] Successfully inserted test event!")
    
    # Query it back
    count = db.query(Event).count()
    print(f"[+] Total events in DB: {count}")
    
    all_events = db.query(Event).all()
    for e in all_events:
        print(f"    Event ID: {e.id}, Campaign: {e.campaign_id}, Type: {e.event_type}, Email: {e.user_email}")
except Exception as e:
    db.rollback()
    print(f"[-] Insertion failed: {e}")
finally:
    db.close()
