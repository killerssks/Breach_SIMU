from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String)
    type = Column(String)  # phishing, bruteforce, etc.
    status = Column(String, default="active")
    subject = Column(String, nullable=True)
    template = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)