import asyncio
import random
import time

class BruteforceSimulator:

    def __init__(self):
        self.running = False
        self.ip_attempts = {}

    async def start(self, targets, speed, ws_manager):
        self.running = True

        while self.running:
            for target in targets:
                ip = target["ip"]

                # track attempts per IP
                self.ip_attempts.setdefault(ip, [])
                self.ip_attempts[ip].append(time.time())

                # keep only last 10 sec attempts
                self.ip_attempts[ip] = [
                    t for t in self.ip_attempts[ip]
                    if time.time() - t < 10
                ]

                attempts = len(self.ip_attempts[ip])

                # detection logic
                if attempts > 20:
                    status = "blocked"
                elif attempts > 15:
                    status = "suspicious"
                else:
                    status = random.choice(["attempt", "attempt", "success"])

                data = {
                    "ip": ip,
                    "port": target["port"],
                    "status": status,
                    "attempts_last_10s": attempts
                }

                await ws_manager.broadcast(data)

            await asyncio.sleep(1 / speed)

    def stop(self):
        self.running = False


simulator = BruteforceSimulator()