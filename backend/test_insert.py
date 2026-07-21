import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.event import Event
from app.models.campaign import Campaign

db = SessionLocal()
try:
    event = Event(campaign_id=2, organization_id=4, user_email="test@domain.com", event_type="sent", ip_address="127.0.0.1")
    db.add(event)
    db.commit()
    print("[+] Successfully inserted test event!")
    
    # Query it back
    count = db.query(Event).count()
    print(f"[+] Total events in DB: {count}")
except Exception as e:
    db.rollback()
    print(f"[-] Insertion failed: {e}")
finally:
    db.close()
