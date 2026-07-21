import socket
from concurrent.futures import ThreadPoolExecutor

def grab_banner(ip, port):
    try:
        s = socket.socket()
        s.settimeout(1)
        s.connect((ip, port))
        banner = s.recv(1024).decode(errors="ignore").strip()
        s.close()
        return banner
    except:
        return None


def scan_single_port(ip, port):
    try:
        s = socket.socket()
        s.settimeout(0.5)

        result = s.connect_ex((ip, port))
        s.close()

        if result == 0:
            banner = grab_banner(ip, port)

            return {
                "port": port,
                "service": "Unknown",
                "banner": banner or "No banner"
            }

    except:
        return None


def scan_ports(ip, ports):

    results = []

    with ThreadPoolExecutor(max_workers=100) as executor:
        futures = [executor.submit(scan_single_port, ip, p) for p in ports]

        for f in futures:
            res = f.result()
            if res:
                results.append(res)

    return results