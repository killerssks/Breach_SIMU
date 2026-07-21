import random
import time

EVENTS = [
    "process_create",
    "file_write",
    "network_connect",
    "registry_edit"
]

SUSPICIOUS = [
    "cmd.exe spawned",
    "powershell encoded command",
    "unknown exe in temp",
    "connection to suspicious IP"
]

PROCESSES = ["explorer.exe", "cmd.exe", "powershell.exe", "malware.exe"]

def generate_event():
    event_type = random.choice(["process_create", "file_write", "network_connect"])

    event = {
        "timestamp": time.time(),
        "type": event_type,
    }

    if event_type == "process_create":
        parent = random.choice(PROCESSES)
        child = random.choice(PROCESSES)

        event["parent"] = parent
        event["process"] = child

    elif event_type == "file_write":
        event["file"] = f"C:/Temp/malware{random.randint(1,50)}.exe"

    elif event_type == "network_connect":
        event["ip"] = f"185.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"

    return event

def generate_alert():
    return {
        "type": "alert",
        "message": random.choice(SUSPICIOUS),
        "severity": random.choice(["low", "medium", "high"])
    }