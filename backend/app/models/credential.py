from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Credential(Base):
    __tablename__ = "credentials"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    campaign_id = Column(Integer, ForeignKey("campaigns.id"))
    user_email = Column(String)
    captured_data = Column(String)  # store JSON (masked)
    timestamp = Column(DateTime, default=datetime.utcnow)