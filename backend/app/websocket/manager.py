from typing import List
from fastapi import WebSocket
import re

class ConnectionManager:
    def __init__(self):
        # Store active WebSocket connections
        self.active_connections: List[WebSocket] = []
        self.log_history: List[str] = []
        self.sandbox_events_count: int = 0
        self.bruteforce_events_count: int = 0
        self.ddos_packets_count: int = 0
        self.scanner_events_count: int = 0
        self.last_detonated_file: str = "None"

    def reset_counters(self):
        self.log_history = []
        self.sandbox_events_count = 0
        self.bruteforce_events_count = 0
        self.ddos_packets_count = 0
        self.scanner_events_count = 0
        self.last_detonated_file = "None"

    async def connect(self, websocket: WebSocket):
        """Accepts the connection and adds it to the active list."""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[+] WS CONNECTED | Active Connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Removes the connection from the active list."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print("[-] WS DISCONNECTED")

    async def broadcast(self, message: dict):
        """Sends a JSON message to all connected clients (e.g., live logs)."""
        # 🟢 Intercept log message and format it for backend memory history
        log_type = message.get("type")
        msg_text = message.get("message") or message.get("command")
        
        log_str = None
        if log_type == "opened":
            log_str = "[PHISHING] Email opened"
        elif log_type == "clicked":
            log_str = "[PHISHING] Link clicked"
        elif log_type == "submitted":
            log_str = "[CRITICAL] Credentials captured!"
        elif log_type in ("sandbox_status", "sandbox_log") and msg_text:
            log_str = f"[SANDBOX] {msg_text}"
            self.sandbox_events_count += 1
            if log_type == "sandbox_status":
                match = re.search(r"Target:\s*([^\s(]+)", msg_text)
                if match:
                    self.last_detonated_file = match.group(1)
        elif log_type in ("execution_step", "bruteforce_attempt", "bruteforce_success") and msg_text:
            if log_type == "bruteforce_success":
                log_str = "[CRITICAL] Credentials found!"
                self.bruteforce_events_count += 1
            elif log_type == "execution_step":
                log_str = f"[SCANNER] {msg_text}"
                self.scanner_events_count += 1
            else:
                log_str = f"[BRUTEFORCE] {msg_text}"
                self.bruteforce_events_count += 1
        elif log_type == "ddos_status" and msg_text:
            log_str = f"[DDOS] {msg_text}"
        elif log_type == "ddos_packet":
            count = message.get("count", 0)
            target = message.get("target", "")
            log_str = f"[DDOS] {count:,} pkts → {target}"
            self.ddos_packets_count = count
            
        if log_str:
            self.log_history.insert(0, log_str)
            self.log_history = self.log_history[:50]

        # Broadcast the event
        disconnected_clients = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected_clients.append(connection)

        # Cleanup dead connections found during broadcast
        for client in disconnected_clients:
            self.disconnect(client)

# Single instance for the whole application
manager = ConnectionManager()