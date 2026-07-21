import socket
from concurrent.futures import ThreadPoolExecutor

COMMON_PORTS = [21, 22, 80, 135, 139, 443, 445, 3389]

# Check if host is alive via multiple ports
def is_alive(ip):
    for port in COMMON_PORTS:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.3)

            if sock.connect_ex((ip, port)) == 0:
                sock.close()
                return ip

            sock.close()
        except:
            pass
    return None


# Scan network (FAST + NO NPCAP)
def scan_network(ip_range):
    base = ip_range.split("/")[0]
    base = ".".join(base.split(".")[:3])

    ips = [f"{base}.{i}" for i in range(1, 255)]

    live_hosts = []

    with ThreadPoolExecutor(max_workers=200) as executor:
        results = executor.map(is_alive, ips)

    for ip in results:
        if ip:
            live_hosts.append({
                "ip": ip,
                "mac": "unknown"
            })

    return live_hosts


# TCP SYN Port Scan with Firewall Detection (with socket fallback)
def scan_ports(ip, use_npcap: bool = True):
    open_ports = []
    filtered_ports = []
    try:
        import scapy.all as scapy
        scapy_loaded = True if use_npcap else False
    except ImportError:
        scapy_loaded = False

    if not scapy_loaded:
        # Fall back to standard socket connect sweep
        for port in COMMON_PORTS:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.5)
                if sock.connect_ex((ip, port)) == 0:
                    open_ports.append(port)
                sock.close()
            except Exception:
                pass
        return open_ports, filtered_ports

    for port in COMMON_PORTS:
        try:
            pkt = scapy.IP(dst=ip)/scapy.TCP(dport=port, flags="S")
            resp = scapy.sr1(pkt, timeout=0.5, verbose=0)
            
            if resp is None:
                # No response usually indicates the packet was silently dropped by a firewall
                filtered_ports.append(port)
            elif resp.haslayer(scapy.TCP):
                if resp.getlayer(scapy.TCP).flags == 0x12: # SYN-ACK (Open)
                    send_rst = scapy.IP(dst=ip)/scapy.TCP(dport=port, flags="AR")
                    scapy.send(send_rst, verbose=0)
                    open_ports.append(port)
                elif resp.getlayer(scapy.TCP).flags == 0x14: # RST-ACK (Closed)
                    pass
            elif resp.haslayer(scapy.ICMP):
                if int(resp.getlayer(scapy.ICMP).type) == 3:
                     filtered_ports.append(port)
        except Exception:
            pass

    return open_ports, filtered_ports