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
    campaigns = db.query(Campaign).all()
    print("--- Campaigns ---")
    for c in campaigns:
        print(f"ID: {c.id}, Name: {c.name}, Status: {c.status}, Org ID: {c.organization_id}")

    events = db.query(Event).all()
    print("\n--- Events ---")
    for e in events:
        print(f"ID: {e.id}, Campaign ID: {e.campaign_id}, Email: {e.user_email}, Type: {e.event_type}, Org ID: {e.organization_id}")

    creds = db.query(Credential).all()
    print("\n--- Credentials ---")
    for cr in creds:
        print(f"ID: {cr.id}, Campaign ID: {cr.campaign_id}, Email: {cr.user_email}, captured_data: {cr.captured_data}")

finally:
    db.close()
