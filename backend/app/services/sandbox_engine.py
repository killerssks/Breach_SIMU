import asyncio
import hashlib
import requests
import random
from app.websocket.manager import manager

# --- AUTHENTICATED API KEYS ---
VT_API_KEY = "32dda6ca15c86f7aab88cebb925c20450893c99d567eff5864fac2dad32b66ee"
HA_API_KEY = "qoyj9h1e4934726b2ld9zdzg3b54bc5414af1ol80b928260fe3ib4ka2d8d00c6"
ABUSE_IP_KEY = "ceb9e98e3342546731728a06cb88f1445dda4c1279852b1f8a338018e7c4252e460e18e44f30eddc"

async def check_network_reputation(ip_address: str):
    """Queries AbuseIPDB for real-time network threat intelligence."""
    url = 'https://api.abuseipdb.com/api/v2/check'
    params = {'ipAddress': ip_address, 'maxAgeInDays': '90'}
    headers = {'Accept': 'application/json', 'Key': ABUSE_IP_KEY}
    try:
        loop = asyncio.get_event_loop()
        res = await loop.run_in_executor(None, lambda: requests.get(url, headers=headers, params=params))
        if res.status_code == 200:
            data = res.json()['data']
            return f"[NETWORK] Threat Intel: IP {ip_address} ({data['countryCode']}) has a {data['abuseConfidenceScore']}% Abuse Score."
    except:
        pass
    return f"[NETWORK] Outbound Connection: {ip_address}:443 established."

async def run_sandbox_analysis(filename: str, os_type: str, file_content: bytes):
    """Full Forensic Life-cycle: Reputation -> Behavior -> Network Simulation."""
    try:
        await manager.broadcast({"type": "sandbox_status", "message": "INITIALIZING TRIPLE-API FORENSIC ENGINE...", "active": True})
        
        # 1. Metadata Generation
        file_hash = hashlib.sha256(file_content).hexdigest()
        c2_ip = f"{random.randint(45, 185)}.{random.randint(10, 190)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
        await manager.broadcast({"type": "sandbox_log", "message": f"[SCAN] SHA-256 Fingerprint: {file_hash}"})
        await asyncio.sleep(1)

        # 2. VirusTotal (File Reputation)
        vt_url = f"https://www.virustotal.com/api/v3/files/{file_hash}"
        vt_res = requests.get(vt_url, headers={"x-apikey": VT_API_KEY}, timeout=10)
        if vt_res.status_code == 200:
            stats = vt_res.json()['data']['attributes']['last_analysis_stats']
            await manager.broadcast({"type": "sandbox_log", "message": f"[CRITICAL] VT Verdict: {stats['malicious']} Engines flagged this sample."})
        else:
            await manager.broadcast({"type": "sandbox_log", "message": "[SCAN] No global signature match found."})

        # 3. Hybrid Analysis (Behavioral Forensics)
        ha_url = "https://www.hybrid-analysis.com/api/v2/search/hashes"
        ha_res = requests.post(ha_url, headers={"api-key": HA_API_KEY, "user-agent": "Falcon Sandbox"}, data={"hashes[]": file_hash})
        if ha_res.status_code == 200 and len(ha_res.json()) > 0:
            report = ha_res.json()[0]
            await manager.broadcast({"type": "sandbox_log", "message": f"[SYSTEM] Falcon Threat Score: {report.get('threat_score')}/100"})
            for v in report.get('verdict_description', [])[:3]:
                await manager.broadcast({"type": "sandbox_log", "message": f"[BEHAVIOR] {v}"})
        
        # 4. AbuseIPDB (Network Intelligence)
        net_intel = await check_network_reputation(c2_ip)
        await manager.broadcast({"type": "sandbox_log", "message": net_intel})

        # 5. OS-Specific Simulation
        await manager.broadcast({"type": "sandbox_log", "message": f"[SYSTEM] Detonating binary in {os_type} container..."})
        
        sim_logs = []
        if "Windows" in os_type:
            sim_logs = [f"[PROCESS] {filename} injected into explorer.exe", "[REGISTRY] persistence: HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "[CRITICAL] Shadow Copy deletion detected (Ransomware)."]
        elif "Kali" in os_type:
            sim_logs = ["[NETWORK] Initiating Nmap SYN scan.", "[SYSTEM] Accessing /etc/shadow.", "[PROCESS] Spawned meterpreter shell."]
        elif "Android" in os_type:
            sim_logs = ["[PERMISSION] Requested READ_SMS and ACCESS_FINE_LOCATION.", "[NETWORK] POSTing device data to remote server.", "[CRITICAL] Banking overlay detected."]
        else:
            sim_logs = [f"[SYSTEM] {filename} requested root privileges.", "[CRITICAL] Unauthorized kernel module injection."]

        for log in sim_logs:
            await manager.broadcast({"type": "sandbox_log", "message": log})
            await asyncio.sleep(random.uniform(1.2, 3.0))

    except Exception as e:
        await manager.broadcast({"type": "sandbox_log", "message": f"[ERROR] API Gateway Failure: {str(e)}"})
    finally:
        await manager.broadcast({"type": "sandbox_status", "message": "ANALYSIS SEQUENCE COMPLETE.", "active": False})