import sys
import os

# Adjust path to import app package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.campaign import Campaign
from app.models.event import Event
from app.models.credential import Credential

db = SessionLocal()
try:
    num_events = db.query(Event).delete()
    num_creds = db.query(Credential).delete()
    num_campaigns = db.query(Campaign).delete()
    db.commit()
    print(f"[+] Wiped {num_events} Events, {num_creds} Credentials, and {num_campaigns} Campaigns successfully.")
except Exception as e:
    db.rollback()
    print(f"[-] Wiping failed: {e}")
finally:
    db.close()
