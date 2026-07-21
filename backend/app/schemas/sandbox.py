from pydantic import BaseModel, Field
from typing import Optional, List

class SandboxStart(BaseModel):
    filename: str
    mode: str
    hash: Optional[str] = None

class SandboxConfig(BaseModel):
    """Configuration for a sandbox detonation."""
    os_env: str = Field(description="The environment identifier (e.g., w11x64native, w10x64_office, mac-monterey)")
    analysis_time: int = Field(default=120, description="Analysis time in seconds (30-500)")
    network_mode: str = Field(default="HTTPS", description="Network access mode (e.g., HTTPS, Internet Access, None)")
    code_analysis: List[str] = Field(default=[], description="List of analysis flags like AMSI, HCA, VBA")
    intelligence: str = Field(default="URL Reputation", description="Intelligence settings")
    tags: List[str] = Field(default=[], description="Tags for the analysis")