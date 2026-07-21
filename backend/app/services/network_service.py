import psutil
import socket

def get_interfaces():
    interfaces = []
    addrs = psutil.net_if_addrs()

    for iface, addr_list in addrs.items():
        for addr in addr_list:
            if addr.family == socket.AF_INET:
                interfaces.append({
                    "name": iface,
                    "ip": addr.address,
                    "netmask": addr.netmask
                })

    return interfaces

def get_subnet(ip):
    parts = ip.split(".")
    return f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"