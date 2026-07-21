import socket
import asyncio

async def scan_ports_ws(ip, ports, ws_manager):

    total = len(ports)
    scanned = 0

    for port in ports:
        try:
            s = socket.socket()
            s.settimeout(0.5)

            result = s.connect_ex((ip, port))
            s.close()

            scanned += 1

            # send progress
            await ws_manager.broadcast({
                "type": "progress",
                "value": int((scanned / total) * 100)
            })

            if result == 0:
                banner = ""

                try:
                    s = socket.socket()
                    s.settimeout(1)
                    s.connect((ip, port))
                    banner = s.recv(1024).decode(errors="ignore")
                    s.close()
                except:
                    banner = "No banner"

                await ws_manager.broadcast({
                    "type": "port",
                    "data": {
                        "port": port,
                        "banner": banner
                    }
                })

        except:
            continue

        await asyncio.sleep(0.001)