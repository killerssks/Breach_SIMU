from pydantic import BaseModel
from typing import List

class Target(BaseModel):
    ip: str
    port: int

class StartAttack(BaseModel):
    targets: List[Target]
    speed: int