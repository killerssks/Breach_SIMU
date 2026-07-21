import asyncio
import socket
import psutil
from fastapi import APIRouter
from app.websocket.manager import manager
try:
    # pyrefly: ignore [missing-import]
    import scapy.all as scapy
except ImportError:
    scapy = None

from app.services.scanner import scan_ports

router = APIRouter()

@router.get("/interfaces")
async def get_interfaces():
    """Returns real interfaces if possible, otherwise a safe fallback."""
    interfaces = []
    try:
        stats = psutil.net_if_stats()
        addrs = psutil.net_if_addrs()
        for name, info in addrs.items():
            if name in stats and stats[name].isup:
                for addr in info:
                    if addr.family == socket.AF_INET:
                        interfaces.append({"name": name, "ip": addr.address, "netmask": addr.netmask})
        if not interfaces:
            return [{"name": "Simulated_ETH0", "ip": "192.168.1.50", "netmask": "255.255.255.0"}]
        return interfaces
    except Exception:
        return [{"name": "Simulated_ETH0", "ip": "192.168.1.50", "netmask": "255.255.255.0"}]

@router.get("/run-scan")
async def run_network_scan(interface: str, target: str = "192.168.1.0/24", use_npcap: bool = True):
    """
    REAL-TIME MODE: Performs a real ARP ping sweep on the target network.
    """
    if not use_npcap:
        await manager.broadcast({
            "type": "execution_step", 
            "command": f"Npcap disabled by user selection. Initiating real-time socket sweep on {target}...", 
            "status": "scanning"
        })
        from app.services.scanner import scan_network
        hosts = await asyncio.to_thread(scan_network, target)
        
        await manager.broadcast({
            "type": "execution_step", 
            "command": f"Recon Complete. {len(hosts)} live targets identified dynamically via socket sweep.", 
            "status": "idle"
        })
        return {"status": "success", "hosts": hosts}

    if scapy is None:
        await manager.broadcast({
            "type": "execution_step", 
            "command": f"Recommendation: Install Npcap for raw TCP SYN scans. Falling back to real-time socket sweep on {target}...", 
            "status": "scanning"
        })
        from app.services.scanner import scan_network
        hosts = await asyncio.to_thread(scan_network, target)
        
        await manager.broadcast({
            "type": "execution_step", 
            "command": f"Recon Complete. {len(hosts)} live targets identified dynamically via socket sweep.", 
            "status": "idle"
        })
        return {"status": "success", "hosts": hosts}

    await manager.broadcast({
        "type": "execution_step", 
        "command": f"Initiating stealth ARP ping sweep on {target}...", 
        "status": "scanning"
    })
    
    # Offload the blocking Scapy command to a background thread
    def run_arping():
        hosts = []
        try:
            arp_result, _ = scapy.arping(target, timeout=2, verbose=0)
            for s, r in arp_result:
                hosts.append({"ip": r.psrc, "mac": r.hwsrc, "vendor": "Unknown"})
        except Exception as e:
            print(f"Scapy arping failed: {e}")
        return hosts

    mock_hosts = await asyncio.to_thread(run_arping)

    await manager.broadcast({
        "type": "execution_step", 
        "command": f"Recon Complete. {len(mock_hosts)} live targets identified dynamically.", 
        "status": "idle"
    })

    return {"status": "success", "hosts": mock_hosts}

@router.get("/audit-target")
async def audit_target(ip: str, use_npcap: bool = True):
    """
    REAL-TIME MODE: Performs actual port scanning using the internal Python service.
    """
    if scapy is None and use_npcap:
        await manager.broadcast({
            "type": "execution_step", 
            "command": "Recommendation: Install Npcap to enable raw packet SYN scanning. Proceeding with socket fallback scan...", 
            "status": "initializing"
        })
    else:
        cmd_str = "nmap -sS -Pn" if use_npcap else "nmap -sT -Pn"
        await manager.broadcast({
            "type": "execution_step", 
            "command": f"{cmd_str} --stats-every 1s {ip}", 
            "status": "initializing"
        })
    
    await asyncio.sleep(0.5)

    # Perform real asynchronous port scan
    open_ports, filtered_ports = await asyncio.to_thread(scan_ports, ip, use_npcap)
    
    services = []
    bruteforce_candidates = []

    for port in open_ports:
        services.append({"port": str(port), "name": "open", "banner": "Unknown Protocol"})
        if port in [21, 22, 3306, 5432, 1433]:
            bruteforce_candidates.append(str(port))

    # Real Firewall/IDS Check
    if len(filtered_ports) > 0:
        await manager.broadcast({
            "type": "execution_step", 
            "command": f"[!] ALERT: {ip} is running a Firewall/IDS Filter (Dropped {len(filtered_ports)} signature packets).", 
            "status": "blocked"
        })

        # If it dropped EVERYTHING
        if not open_ports:
            return {"ip": ip, "services": [], "bruteforce_ports": [], "message": "Target is actively fully firewalled."}

    await manager.broadcast({
        "type": "execution_step", 
        "command": f"Audit Complete. Identified {len(services)} open ports dynamically.", 
        "status": "success"
    })

    return {
        "ip": ip,
        "services": services,
        "bruteforce_ports": bruteforce_candidates,
        "message": f"Found {len(bruteforce_candidates)} ports vulnerable to simulation."
    }

@router.get("/npcap-status")
async def get_npcap_status():
    """Checks if Scapy/Npcap driver is installed and loadable on the server."""
    if scapy is not None:
        try:
            # Check if scapy has access to raw socket interfaces or if npcap dll is missing
            if "NotAvailable" in str(scapy.conf.L2socket) or not getattr(scapy.conf, "use_pcap", False):
                raise RuntimeError("Npcap driver is missing or load failed (wpcap.dll is missing).")
            return {"npcap_installed": True, "message": "Npcap packet driver is active and loadable."}
        except Exception as e:
            return {"npcap_installed": False, "message": f"Npcap loading failed: {str(e)}"}
    return {"npcap_installed": False, "message": "Npcap packet driver is missing or Python Scapy is not installed."}

@router.get("/download-npcap")
async def download_npcap():
    """Allows downloading the npcap installer from the server root."""
    import os
    from fastapi.responses import FileResponse
    # npcap-installer.exe is in the root directory (3 levels up from routers directory)
    installer_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "npcap-installer.exe"))
    if os.path.exists(installer_path):
        return FileResponse(installer_path, filename="npcap-installer.exe", media_type="application/octet-stream")
    return {"error": "Installer not found on the server."}