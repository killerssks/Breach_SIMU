from pydantic import BaseModel
from typing import List, Optional

class EmailSchema(BaseModel):
    campaign_name: str
    emails: List[str]
    subject: str
    template: str
    content: Optional[str] = None   # ✅ FIX
    campaign_id: Optional[int] = None