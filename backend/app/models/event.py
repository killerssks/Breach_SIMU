from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    user_email = Column(String)
    event_type = Column(String)
    ip_address = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)