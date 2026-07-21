def analyze(event):
    alerts = []
    score = 0

    if event.get("process") == "powershell.exe":
        alerts.append({"message": "PowerShell execution", "severity": "high"})
        score += 30

    if "Temp" in event.get("file", ""):
        alerts.append({"message": "Temp file execution", "severity": "medium"})
        score += 20

    if "185." in event.get("ip", ""):
        alerts.append({"message": "Suspicious external IP", "severity": "high"})
        score += 40

    return alerts, score