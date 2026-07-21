import React, { useEffect, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { X, Download, Printer, Shield, FileText, CheckCircle2, AlertTriangle, Terminal, Users, Server, Activity, Network, Box } from "lucide-react";
import { AuthContext } from "../context/AuthContext";

export default function ReportPreviewModal({
  isOpen,
  onClose,
  type, // "phishing" | "sandbox" | "ddos"
  data, // campaign details / scan details / stress details
  onDownload, // callback to download PDF
}) {
  const { user } = useContext(AuthContext);
  const modalRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  // 1. Calculate stats based on report type
  let title = "";
  let threatScore = 0.0;
  let threatLevel = "LOW";
  let threatColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  let threatBorder = "border-emerald-500/30";
  let threatBg = "bg-emerald-500/5";
  let stats = [];
  let metadata = {};
  let logs = [];
  let conclusions = [];
  let recommendations = [];

  // Scoped variables we need to display in the breakdown:
  let totalTargets = 0;
  let clickPct = "0.0";
  let submitPct = "0.0";
  const statsObj = data.summaryStats || {};

  if (type === "phishing") {
    title = "PHISHING COMPLIANCE & CREDENTIAL AUDIT REPORT";
    const campaignId = data.campaignId || "N/A";
    const campaignName = data.campaignName || "Tactical Audit";
    const subject = data.subject || "Security Alert";
    const template = data.template || "Standard Phish";
    const usersList = data.users || [];

    totalTargets = usersList.length;
    const openedCount = usersList.filter(u => u.opened || u.clicked || u.submitted).length;
    const clickedCount = usersList.filter(u => u.clicked || u.submitted).length;
    const submittedCount = usersList.filter(u => u.submitted).length;

    const openPct = totalTargets ? ((openedCount / totalTargets) * 100).toFixed(1) : "0.0";
    clickPct = totalTargets ? ((clickedCount / totalTargets) * 100).toFixed(1) : "0.0";
    submitPct = totalTargets ? ((submittedCount / totalTargets) * 100).toFixed(1) : "0.0";

    // Calculate overall Security Score (out of 100) instead of threat level
    let deductions = 0.0;

    const totalTargetsVal = totalTargets;
    const submitPctVal = parseFloat(submitPct);
    const clickPctVal = parseFloat(clickPct);

    // 1. Phishing impact (up to 40 points)
    if (totalTargetsVal > 0) {
      deductions += (submitPctVal * 0.3);
      deductions += (clickPctVal * 0.1);
    }

    // 2. Bruteforce impact (up to 20 points)
    const bfCount = statsObj.bruteforce_events || 0;
    const bfLogs = statsObj.live_logs || [];
    const bfCompromised = bfLogs.some(log => log.includes("[CRITICAL] Credentials found!"));
    if (bfCompromised) {
      deductions += 15.0;
    } else {
      deductions += Math.min(bfCount * 0.2, 5.0);
    }

    // 3. Sandbox impact (up to 20 points)
    const sbCount = statsObj.sandbox_events || 0;
    deductions += Math.min(sbCount * 4.0, 20.0);

    // 4. DDoS impact (up to 10 points)
    const ddosCount = statsObj.ddos_packets || 0;
    if (ddosCount > 0) {
      deductions += Math.min(ddosCount / 50000.0, 10.0);
    }

    // 5. Scanner impact (up to 10 points)
    const scCount = statsObj.scanner_events || 0;
    deductions += Math.min(scCount * 2.0, 10.0);

    threatScore = Math.max(100.0 - deductions, 0.0).toFixed(1);

    if (threatScore >= 85) {
      threatLevel = "EXCELLENT";
      threatColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      threatBorder = "border-emerald-500/30";
      threatBg = "bg-emerald-500/5";
    } else if (threatScore >= 70) {
      threatLevel = "GOOD";
      threatColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
      threatBorder = "border-blue-500/30";
      threatBg = "bg-blue-500/5";
    } else if (threatScore >= 50) {
      threatLevel = "FAIR";
      threatColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      threatBorder = "border-yellow-500/30";
      threatBg = "bg-yellow-500/5";
    } else if (threatScore >= 30) {
      threatLevel = "POOR";
      threatColor = "text-orange-400 bg-orange-500/10 border-orange-500/20";
      threatBorder = "border-orange-500/30";
      threatBg = "bg-orange-500/5";
    } else {
      threatLevel = "CRITICAL";
      threatColor = "text-red-400 bg-red-500/10 border-red-500/20";
      threatBorder = "border-red-500/30";
      threatBg = "bg-red-500/5";
    }

    const isAll = campaignId === "all";
    const isMulti = String(campaignId).includes(",");

    metadata = {
      "Campaign ID": isAll ? "ALL CAMPAIGNS" : isMulti ? "MULTIPLE CAMPAIGNS" : `#${campaignId}`,
      "Campaign Name": isAll ? "All Previous Campaigns" : isMulti ? "Selected Campaigns" : campaignName,
      "Email Subject": isAll ? "Multiple Subjects" : isMulti ? "Multiple Subjects" : subject,
      "Email Template": isAll ? "MULTIPLE TEMPLATES" : isMulti ? "MULTIPLE TEMPLATES" : template.toUpperCase(),
      "Target Organization": "Internal Directory",
      "Timestamp": new Date().toLocaleString(),
    };

    stats = [
      { label: "Total Targets Engaged", value: totalTargets, icon: <Users size={16} className="text-blue-400" /> },
      { label: "Email Open Rate", value: `${openPct}%`, icon: <Activity size={16} className="text-amber-400" /> },
      { label: "Click-Through Rate", value: `${clickPct}%`, icon: <Activity size={16} className="text-orange-400" /> },
      { label: "Credential Harvest Rate", value: `${submitPct}%`, icon: <Shield size={16} className="text-red-400" /> },
    ];

    logs = usersList.map(u => ({
      col1: u.email,
      col2: u.submitted ? "SUBMITTED" : u.clicked ? "CLICKED" : u.opened ? "OPENED" : "SENT",
      col3: u.password ? `CAPTURED (${u.password})` : "None Captured",
      col4: u.ip || "N/A",
      col5: u.time || "Real-time stream",
      isCompromised: u.submitted,
    }));

    conclusions = [];
    recommendations = [];

    if (openedCount > 0) {
      conclusions.push("Inbound Security Gateway Bypass: Phishing emails bypassed email gateway scanners, indicating weak SPF/DKIM validation or outdated signature filters on the organization's mail server.");
      recommendations.push("Harden Mail Verification Protocols: Set strict DMARC policy (p=reject) and implement robust SPF and DKIM keys to defend against domain spoofing.");
    } else {
      conclusions.push("No Email Open Events: Simulated phishing emails did not record any opens. The emails may have been blocked by the gateway or ignored by users.");
      recommendations.push("Monitor Gateway Logs: Analyze email gateway records to verify if simulation emails were quarantined or rejected by local spam filters.");
    }

    if (clickedCount > 0) {
      conclusions.push("Target Link Susceptibility: Multiple employees clicked links within the email template, indicating vulnerability to social engineering themes.");
      recommendations.push("Targeted Phishing Training: Conduct focused social engineering simulation training sessions for employees who interacted with audit links.");
    }

    if (submittedCount > 0) {
      conclusions.push(`Credential Exfiltration Detected: ${submittedCount} target account(s) submitted passwords in plain text during the audit simulation.`);
      recommendations.push("Implement WebAuthn / FIDO2 Authentication: Transition to passwordless credentials or hardware keys (like YubiKeys) to make stolen password strings entirely useless.");
    } else if (openedCount > 0) {
      conclusions.push("Zero Credentials Harvested: No password submissions were recorded despite email engagement, indicating baseline caution among target recipients.");
      recommendations.push("Enforce Password Managers: Continue encouraging password manager auto-fill configurations to prevent typing passwords on unknown forms.");
    }
  } else if (type === "sandbox") {
    title = "MALWARE SANDBOX BEHAVIORAL ANALYSIS REPORT";
    const filename = data.selectedFile?.name || "SuspiciousPayload.exe";
    const environment = data.selectedOS || "w10x64_office";
    const fileLogs = data.logs || [];

    // Analyze logs for risk indicators
    const logStr = fileLogs.join("\n").toLowerCase();
    const hasCritical = logStr.includes("inject") || logStr.includes("bypass") || logStr.includes("exploit") || logStr.includes("malicious");
    const hasHigh = logStr.includes("registry") || logStr.includes("network") || logStr.includes("create") || logStr.includes("write");

    if (hasCritical) {
      threatScore = 9.4;
      threatLevel = "CRITICAL";
      threatColor = "text-red-400 bg-red-500/10 border-red-500/20";
      threatBorder = "border-red-500/30";
      threatBg = "bg-red-500/5";
    } else if (hasHigh) {
      threatScore = 7.2;
      threatLevel = "HIGH";
      threatColor = "text-orange-400 bg-orange-500/10 border-orange-500/20";
      threatBorder = "border-orange-500/30";
      threatBg = "bg-orange-500/5";
    } else if (fileLogs.length > 0) {
      threatScore = 4.8;
      threatLevel = "MEDIUM";
      threatColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      threatBorder = "border-yellow-500/30";
      threatBg = "bg-yellow-500/5";
    } else {
      threatScore = 1.2;
      threatLevel = "LOW";
      threatColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      threatBorder = "border-emerald-500/30";
      threatBg = "bg-emerald-500/5";
    }

    metadata = {
      "Target File": filename,
      "Sandbox OS Profile": environment,
      "Total Execution Steps": fileLogs.length,
      "File Hash (Simulated)": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "Analysis Timestamp": new Date().toLocaleString(),
    };

    stats = [
      { label: "Target Profile", value: environment, icon: <Server size={16} className="text-blue-400" /> },
      { label: "Log Events Captured", value: fileLogs.length, icon: <Terminal size={16} className="text-amber-400" /> },
      { label: "Vulnerability Threat Rating", value: threatScore, icon: <Shield size={16} className="text-red-400" /> },
    ];

    logs = fileLogs.map((log, index) => {
      let isRisk = log.includes("[WARNING]") || log.includes("[ALERT]") || log.toLowerCase().includes("fail") || log.toLowerCase().includes("error");
      return {
        col1: `Step ${index + 1}`,
        col2: log.includes(" → ") ? log.split(" → ")[0] : "SYSTEM",
        col3: log.includes(" → ") ? log.split(" → ")[1] : log,
        col4: "Local Sandboxed VM",
        col5: new Date().toLocaleTimeString(),
        isCompromised: isRisk,
      };
    });

    conclusions = [];
    recommendations = [];

    if (hasCritical) {
      conclusions.push("High Risk Behaviors Flagged: The analyzed file triggered critical security flags for evasion tactics or potential system manipulation.");
      recommendations.push("Block and Quarantine Hash: Extract the binary file checksum and add it to EDR and endpoint blocklists across all user workstations.");
    } else if (hasHigh) {
      conclusions.push("Suspicious Host Activity: The analyzed file performed registry hooks, wrote files, or initialized network packets.");
      recommendations.push("Monitor Network Indicators: Track C2 communication logs or remote target IP addresses mapped in the execution trace.");
    } else if (fileLogs.length > 0) {
      conclusions.push("Standard Execution Sequence: The file executed standard processes without triggering critical behavioral alerts.");
      recommendations.push("Routine Payload Check: Keep tracking file heuristics and perform static analysis on any updates to this package.");
    } else {
      conclusions.push("No Behavioral Heuristics: No process execution steps or system logs were captured during the sandbox run.");
      recommendations.push("Validate Sandbox VM Setup: Verify sandbox initialization parameters and guest agent execution states.");
    }
  } else if (type === "ddos") {
    title = "NETWORK STRESSOR & DDOS SIMULATION REPORT";
    const targetUrl = data.url || "N/A";
    const targetIp = data.targetIp || "Resolving...";
    const attackType = data.attackType || "HTTP Flood";
    const threads = data.threads || 4;
    const packetCount = data.packetCount || 0;
    const ddosLogs = data.logs || [];

    // Threat Score
    if (packetCount > 5000) {
      threatScore = 9.2;
      threatLevel = "CRITICAL";
      threatColor = "text-red-400 bg-red-500/10 border-red-500/20";
      threatBorder = "border-red-500/30";
      threatBg = "bg-red-500/5";
    } else if (packetCount > 1000) {
      threatScore = 7.1;
      threatLevel = "HIGH";
      threatColor = "text-orange-400 bg-orange-500/10 border-orange-500/20";
      threatBorder = "border-orange-500/30";
      threatBg = "bg-orange-500/5";
    } else if (packetCount > 100) {
      threatScore = 4.5;
      threatLevel = "MEDIUM";
      threatColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      threatBorder = "border-yellow-500/30";
      threatBg = "bg-yellow-500/5";
    } else {
      threatScore = 1.5;
      threatLevel = "LOW";
      threatColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      threatBorder = "border-emerald-500/30";
      threatBg = "bg-emerald-500/5";
    }

    metadata = {
      "Target URL / Domain": targetUrl,
      "Resolved Target IP": targetIp,
      "Attack Vector Type": attackType,
      "Configured Threads": threads,
      "Execution Duration": data.elapsed ? `${data.elapsed}s` : "N/A",
      "Stressor Timestamp": new Date().toLocaleString(),
    };

    stats = [
      { label: "Attack Mode", value: attackType, icon: <Server size={16} className="text-blue-400" /> },
      { label: "Threads Spawned", value: threads, icon: <Terminal size={16} className="text-amber-400" /> },
      { label: "Packets/Requests Sent", value: packetCount.toLocaleString(), icon: <Activity size={16} className="text-orange-400" /> },
      { label: "Session Duration", value: data.elapsed ? `${data.elapsed}s` : "0s", icon: <Shield size={16} className="text-emerald-400" /> },
    ];

    logs = ddosLogs.slice(0, 100).map((log, index) => {
      let isErr = log.toLowerCase().includes("error") || log.toLowerCase().includes("failed");
      return {
        col1: `Event ${index + 1}`,
        col2: "STRESS_ENGINE",
        col3: log,
        col4: targetIp,
        col5: new Date().toLocaleTimeString(),
        isCompromised: isErr,
      };
    });

    conclusions = [];
    recommendations = [];

    if (packetCount > 0) {
      conclusions.push(`Volumetric Traffic Intake: Target received ${packetCount.toLocaleString()} request packets. Server accepted flood traffic without hardware-level blocks.`);
      recommendations.push("Implement Edge WAF Protection: Deploy anycast proxy systems (such as Cloudflare or AWS Shield) to inspect, drop, and throttle anomalous request floods.");
      conclusions.push(`Connection Handshakes Allowed: The simulation established active connections over ${threads} threads, consuming server network sockets.`);
      recommendations.push("Configure Host Rate Limiting: Set strict connection and request rate limit thresholds in web server configs (e.g. Nginx limit_req zone).");
    } else {
      conclusions.push("No Active Stress Load: Stressor session completed with 0 packets transmitted to the target host.");
      recommendations.push("Verify Stress Engine Configuration: Check target endpoint reachability and stress engine thread parameters.");
    }
  } else if (type === "bruteforce") {
    title = "SUBNET DISCOVERY & DICTIONARY ATTACK AUDIT REPORT";
    const targetRange = data.targetRange || "N/A";
    const selectedIface = data.selectedIface || "N/A";
    const liveHosts = data.liveHosts || [];
    const attackLogs = data.attackLogs || [];
    const lockedTarget = data.lockedTarget || "N/A";

    const hasSuccess = attackLogs.some(log => log.includes("[SUCCESS]") || log.toLowerCase().includes("cracked") || log.toLowerCase().includes("matched") || log.toLowerCase().includes("success"));

    if (hasSuccess) {
      threatScore = 9.6;
      threatLevel = "CRITICAL";
      threatColor = "text-red-400 bg-red-500/10 border-red-500/20";
      threatBorder = "border-red-500/30";
      threatBg = "bg-red-500/5";
    } else if (liveHosts.length > 0) {
      threatScore = 5.2;
      threatLevel = "MEDIUM";
      threatColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      threatBorder = "border-yellow-500/30";
      threatBg = "bg-yellow-500/5";
    } else {
      threatScore = 1.0;
      threatLevel = "LOW";
      threatColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      threatBorder = "border-emerald-500/30";
      threatBg = "bg-emerald-500/5";
    }

    metadata = {
      "Target Subnet": targetRange,
      "Network Interface": selectedIface,
      "Live Hosts Discovered": liveHosts.length,
      "Target Locked IP": lockedTarget,
      "Dictionary Logs Count": attackLogs.length,
      "Audit Timestamp": new Date().toLocaleString(),
    };

    stats = [
      { label: "Target Subnet", value: targetRange, icon: <Network size={16} className="text-blue-400" /> },
      { label: "Active Hosts", value: liveHosts.length, icon: <Server size={16} className="text-cyan-400" /> },
      { label: "Logs Captured", value: attackLogs.length, icon: <Terminal size={16} className="text-amber-400" /> },
      { label: "Critical Rating", value: threatScore, icon: <Shield size={16} className="text-red-400" /> },
    ];

    const hostLogs = liveHosts.map((h, idx) => ({
      col1: h.ip,
      col2: "HOST DISCOVERY",
      col3: "Active / Responding to Recon Probe",
      col4: h.mac || "N/A",
      col5: new Date().toLocaleTimeString(),
      isCompromised: false,
    }));

    const executionLogs = attackLogs.map((log, idx) => {
      const isSuccess = log.includes("[SUCCESS]") || log.toLowerCase().includes("cracked") || log.toLowerCase().includes("matched") || log.toLowerCase().includes("success");
      return {
        col1: "Attack Engine",
        col2: "DICTIONARY ATTACK",
        col3: log,
        col4: lockedTarget,
        col5: new Date().toLocaleTimeString(),
        isCompromised: isSuccess,
      };
    });

    logs = [...hostLogs, ...executionLogs];
    conclusions = [];
    recommendations = [];

    if (liveHosts.length > 0) {
      conclusions.push(`Subnet Hosts Revealed: ${liveHosts.length} live IP addresses were identified on target range ${targetRange}.`);
      recommendations.push("Implement Local Port Security: Enforce 802.1X network access control and restrict subnet probe packets (ICMP ping sweeps).");
    }
    if (hasSuccess) {
      conclusions.push("Administrative Credentials Cracked: The dictionary engine successfully exfiltrated active plain text login credentials during socket sweep.");
      recommendations.push("Enforce MFA & Strong Passwords: Require multi-factor authentication for administrative dashboards and establish password policy length limits.");
    }
  } else if (type === "unified") {
    title = "COMPREHENSIVE AUDIT & THREAT REPORT";
    const phishingData = data.phishing || { sent: 0, opened: 0, clicked: 0, submitted: 0 };
    const bruteforceData = data.bruteforce || { attempts: 0, breaches: 0, hostsCount: 0 };
    const sandboxData = data.sandbox || { total: 0, critical: 0 };
    const ddosData = data.ddos || { packets: 0, type: "None", elapsed: 0 };
    
    // Security score is passed directly in data.securityScore
    threatScore = data.securityScore !== undefined ? parseFloat(data.securityScore).toFixed(1) : 100.0;

    if (threatScore >= 85) {
      threatLevel = "EXCELLENT";
      threatColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      threatBorder = "border-emerald-500/30";
      threatBg = "bg-emerald-500/5";
    } else if (threatScore >= 70) {
      threatLevel = "GOOD";
      threatColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
      threatBorder = "border-blue-500/30";
      threatBg = "bg-blue-500/5";
    } else if (threatScore >= 50) {
      threatLevel = "FAIR";
      threatColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      threatBorder = "border-yellow-500/30";
      threatBg = "bg-yellow-500/5";
    } else if (threatScore >= 30) {
      threatLevel = "POOR";
      threatColor = "text-orange-400 bg-orange-500/10 border-orange-500/20";
      threatBorder = "border-orange-500/30";
      threatBg = "bg-orange-500/5";
    } else {
      threatLevel = "CRITICAL";
      threatColor = "text-red-400 bg-red-500/10 border-red-500/20";
      threatBorder = "border-red-500/30";
      threatBg = "bg-red-500/5";
    }

    metadata = {
      "Target Organization": "Internal Active Directory",
      "Total Active Modules": "4 Simulation Suites",
      "Unified Threat Rating": `${((100 - threatScore)/10).toFixed(1)} / 10.0 (CVSS Equivalent)`,
      "Overall Security Score": `${threatScore}% (Healthy Base)`,
      "Capture Timeline Range": "Real-Time Operations Command Log",
      "Timestamp": new Date().toLocaleString(),
    };

    stats = [
      { label: "Overall Security Score", value: `${threatScore}%`, icon: <Shield size={16} className="text-emerald-400" /> },
      { label: "Phishing Harvests", value: phishingData.submitted, icon: <Users size={16} className="text-blue-400" /> },
      { label: "Sandbox Events", value: sandboxData.total, icon: <Box size={16} className="text-purple-400" /> },
      { label: "DDoS Stress Load", value: ddosData.packets.toLocaleString(), icon: <Activity size={16} className="text-orange-400" /> },
    ];

    logs = (data.liveLogs || []).map((log, index) => {
      let moduleName = "SYSTEM";
      if (log.includes('[PHISHING]')) moduleName = "PHISHING";
      else if (log.includes('[BRUTEFORCE]')) moduleName = "BRUTEFORCE";
      else if (log.includes('[SANDBOX]')) moduleName = "SANDBOX";
      else if (log.includes('[DDOS]')) moduleName = "DDOS";
      else if (log.includes('[PORT_SCAN]')) moduleName = "PORT_SCAN";

      return {
        col1: `Event ${index + 1}`,
        col2: moduleName,
        col3: log,
        col4: "Command Center HUD",
        col5: new Date().toLocaleTimeString(),
        isCompromised: log.includes("[CRITICAL]") || log.includes("[!") || log.includes("SUCCESS"),
      };
    });

    conclusions = [
      "Unified Tactical Assessment Compiled: Real-time simulation activities were audited across all attack vectors.",
      `Phishing Vulnerability: Target organization has a CTR click rate indicating susceptibilities to targeted social engineering.`
    ];
    recommendations = [
      "Deploy Edge Mitigation Blocks: Establish web application firewalls and host rate limit thresholds.",
      "Conduct Phishing Training: Run interactive educational sessions for compromised target mail addresses."
    ];
  }

  const handlePrint = () => {
    const originalTitle = document.title;
    
    // Construct dynamic filename title
    const companyName = (user?.name || "audit").replace(/\s+/g, "_").toLowerCase();
    const cleanTitle = `roblocksec_${type}_${companyName}_report`;
    
    document.title = cleanTitle;
    window.print();
    
    // Restore original title after a short timeout
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return createPortal(
    /* Backdrop overlay */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 print-modal-backdrop"
      style={{ backgroundColor: "rgba(3, 7, 18, 0.8)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&family=Plus+Jakarta+Sans:wght@300;400;500;700;800&display=swap');
        
        /* Apply screen styling overlay to the preview sheet wrapper */
        .print-wrapper {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          background-color: #ffffff !important;
          color: #334155 !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08) !important;
        }
        
        .print-wrapper h1,
        .print-wrapper h2,
        .print-wrapper h3,
        .print-wrapper h4,
        .print-wrapper h5 {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          color: #0f172a !important;
          font-weight: 750 !important;
        }
        
        .print-wrapper p,
        .print-wrapper span {
          color: #475569 !important;
        }

        .print-wrapper .font-mono {
          font-family: 'Times New Roman', Times, Georgia, serif !important;
        }
        
        /* Grid cards & panels styling */
        .print-wrapper .bg-slate-50,
        .print-wrapper .bg-slate-50\\/50,
        .print-wrapper .bg-slate-100 {
          background-color: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
        }
        
        .print-wrapper .bg-white {
          background-color: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
        }

        .print-wrapper .text-slate-850,
        .print-wrapper .text-slate-800 {
          color: #1e293b !important;
        }
        .print-wrapper .text-slate-900,
        .print-wrapper .text-slate-955,
        .print-wrapper .text-slate-950 {
          color: #0f172a !important;
        }

        /* Metric cards stats value */
        .print-wrapper .text-slate-955.font-mono {
          color: #0284c7 !important;
        }

        /* Border colors */
        .print-wrapper .border-slate-200,
        .print-wrapper .border-slate-100,
        .print-wrapper .border-slate-150 {
          border-color: #e2e8f0 !important;
        }

        /* Tables override */
        .print-wrapper table {
          border-collapse: collapse !important;
        }
        .print-wrapper th {
          background-color: #f1f5f9 !important;
          color: #0369a1 !important;
          font-family: 'Times New Roman', Times, Georgia, serif !important;
          font-size: 8.5px !important;
          border-bottom: 1px solid #cbd5e1 !important;
        }
        .print-wrapper td {
          font-family: 'Times New Roman', Times, Georgia, serif !important;
          color: #334155 !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .print-wrapper tr:hover {
          background-color: #f8fafc !important;
        }
        
        /* Barcode clearances block */
        .print-wrapper .bg-slate-900 {
          background-color: #0f172a !important;
          border: 1px solid #e2e8f0 !important;
        }
        
        /* Alert states tags */
        .print-wrapper .bg-red-50 {
          background-color: rgba(239, 68, 68, 0.04) !important;
          color: #dc2626 !important;
          border: 1px solid rgba(239, 68, 68, 0.1) !important;
        }
        .print-wrapper .bg-orange-50 {
          background-color: rgba(249, 115, 22, 0.04) !important;
          color: #ea580c !important;
          border: 1px solid rgba(249, 115, 22, 0.1) !important;
        }
        .print-wrapper .bg-amber-50 {
          background-color: rgba(245, 158, 11, 0.04) !important;
          color: #d97706 !important;
          border: 1px solid rgba(245, 158, 11, 0.1) !important;
        }
        .print-wrapper .bg-blue-50 {
          background-color: rgba(59, 130, 246, 0.04) !important;
          color: #2563eb !important;
          border: 1px solid rgba(59, 130, 246, 0.1) !important;
        }
        .print-wrapper .bg-emerald-50 {
          background-color: rgba(16, 185, 129, 0.04) !important;
          color: #059669 !important;
          border: 1px solid rgba(16, 185, 129, 0.1) !important;
        }
        
        .print-wrapper svg.text-slate-200 {
          color: #e2e8f0 !important;
        }
        
        /* 🖨️ MEDIA PRINT OVERRIDES (Forces clean white ink-saving layout when printed/saved) */
        @media print {
          #root {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-modal-backdrop,
          .print-modal-container,
          .print-scroll-container {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          .print-wrapper {
            position: relative !important;
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 100% !important;
            left: 0 !important;
            top: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
          }
          .print-wrapper h1,
          .print-wrapper h2,
          .print-wrapper h3,
          .print-wrapper h4,
          .print-wrapper h5,
          .print-wrapper p,
          .print-wrapper span,
          .print-wrapper td,
          .print-wrapper th {
            color: #0f172a !important;
          }
          .print-wrapper p.text-slate-400,
          .print-wrapper span.text-slate-400,
          .print-wrapper span.text-slate-500,
          .print-wrapper td.text-slate-400 {
            color: #475569 !important;
          }
          .print-wrapper table,
          .print-wrapper th,
          .print-wrapper td,
          .print-wrapper div,
          .print-wrapper border {
            border-color: #cbd5e1 !important;
          }
          .print-wrapper th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
          }
          .print-wrapper .bg-white\\/5 {
            background-color: #f8fafc !important;
            border-color: #cbd5e1 !important;
          }
          .print-wrapper .bg-slate-50,
          .print-wrapper .bg-slate-50\\/50,
          .print-wrapper .bg-slate-100 {
            background-color: #f8fafc !important;
            border-color: #e2e8f0 !important;
          }
          .print-wrapper .bg-white {
            background-color: #ffffff !important;
            border-color: #cbd5e1 !important;
          }
          .print-wrapper .bg-slate-900 {
            background-color: #0f172a !important;
            color: #ffffff !important;
          }
          .print-wrapper svg.text-slate-200 {
            color: #e2e8f0 !important;
          }
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          @page {
            size: A4 portrait;
            margin: 20mm !important;
          }
        }
      ` }} />

      {/* Modal Container Card */}
      <div
        className="relative w-full max-w-5xl h-[90vh] flex flex-col rounded-lg border overflow-hidden shadow-2xl print-modal-container"
        style={{
          background: "#080C14",
          borderColor: "rgba(255, 255, 255, 0.08)",
          boxShadow: "0 0 40px rgba(56, 130, 246, 0.08), 0 20px 50px rgba(0,0,0,0.8)",
          animation: "confirmModalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fututistic Grid design lines */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>

        {/* Header Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0c1220] select-none shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <FileText size={18} className="text-blue-500 animate-pulse" />
            <div>
              <span className="text-[10px] font-bold font-mono tracking-widest uppercase text-slate-500">
                Audit Report Center
              </span>
              <h2 className="text-sm font-bold text-slate-200">
                Interactive Report Preview
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Download size={14} /> Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[var(--bg-elevated)] hover:bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1.5 rounded border border-white/5 transition-all cursor-pointer active:scale-95"
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-all cursor-pointer"
              title="Close Preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Report Content Area */}
        <div className="flex-1 overflow-y-auto p-8 font-sans text-slate-300 relative select-text print:p-0 print:bg-white print:text-black print-scroll-container">
          
          {/* A4 Styled Sheet Wrapper */}
          <div className="w-[210mm] min-h-[297mm] max-w-full mx-auto bg-white border border-slate-200 p-[15mm] rounded shadow-2xl relative print:border-none print:shadow-none print:bg-white print:text-black print-wrapper print-card-content">
            
            {/* Watermark logo repeating on all pages (only visible in browser printing) */}
            <div className="hidden print:flex fixed inset-0 items-center justify-center pointer-events-none select-none" style={{ zIndex: -1 }}>
              <img 
                src="/logo.png" 
                alt="Watermark" 
                className="w-[280px] h-[280px] object-contain" 
                style={{
                  opacity: 0.035,
                  transform: "rotate(-30deg)"
                }} 
              />
            </div>

            {/* Header Identity strip */}
            <div className="flex justify-between items-center border-b-2 border-blue-500 pb-5 mb-8 select-none font-mono">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="ROBLOCKSEC" className="h-9 w-auto object-contain shrink-0" />
                <p className="text-[10px] font-bold text-slate-500 tracking-wider">
                  SECURE TACTICAL CONTROL CENTER // AUDIT LOG
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold tracking-widest text-slate-650 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
                  DOC-REF: BS-{type.toUpperCase()}-{Math.floor(1000 + Math.random() * 9000)}
                </span>
              </div>
            </div>

            {/* Document Title */}
            <div className="mb-6 border-l-4 border-blue-600 pl-4 py-1">
              <h1 className="text-xl md:text-2xl font-black text-slate-950 tracking-tight uppercase leading-none font-sans">
                {title}
              </h1>
              <p className="text-[9px] text-slate-500 font-mono mt-1.5 tracking-wider">
                REAL-TIME THREAT DETONATION LOGS // SEC-OPS COMPLIANCE REPORT
              </p>
            </div>

            {/* Risk Assessment Box */}
            <div className="grid grid-cols-1 md:grid-cols-12 border border-slate-200 rounded-lg overflow-hidden mb-6 shadow-sm bg-slate-50/50">
              <div className={`md:col-span-8 p-5 border-b md:border-b-0 md:border-r border-slate-200 border-l-4 ${
                threatLevel === "CRITICAL" ? "border-l-red-500" :
                threatLevel === "HIGH" ? "border-l-orange-500" :
                threatLevel === "MEDIUM" || threatLevel === "FAIR" ? "border-l-yellow-500" :
                threatLevel === "GOOD" ? "border-l-blue-500" :
                "border-l-emerald-500"
              }`}>
                <span className="text-[9px] font-bold font-mono tracking-widest text-slate-500 block uppercase mb-1">
                  TACTICAL COMPLIANCE ANALYSIS & AUDIT REPORT
                </span>
                <h3 className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5 font-mono">
                  Threat Evaluation: <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 font-bold border border-slate-300 ml-1.5">{threatLevel} RISK</span>
                </h3>
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                  Real-time exfiltration assessment details active log payloads, credential harvest metrics, system detonation telemetry, and volumetric flood parameters. Score indicates target hardening status.
                </p>
              </div>
              <div className="md:col-span-4 p-4 flex flex-col items-center justify-center bg-slate-50 select-none">
                <div className="relative flex items-center justify-center h-16 w-16">
                  {/* Radial progress background path */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={
                        threatLevel === "CRITICAL" ? "text-red-500" :
                        threatLevel === "HIGH" ? "text-orange-500" :
                        threatLevel === "MEDIUM" || threatLevel === "FAIR" ? "text-yellow-500" :
                        threatLevel === "GOOD" ? "text-blue-500" :
                        "text-emerald-500"
                      }
                      strokeDasharray={`${threatScore}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute font-mono text-center">
                    <span className="text-base font-black text-slate-900 block leading-none">{Math.round(threatScore)}</span>
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">SCORE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Metadata Grid */}
            <div className="mb-6">
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2 font-mono flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-blue-600 rounded-full"></span>
                [1.0] Audit Metadata
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 bg-slate-50 border border-slate-200 p-4 rounded text-xs font-mono">
                {Object.entries(metadata).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-slate-100 pb-1.5 gap-4">
                    <span className="text-slate-500 font-medium shrink-0">{key}:</span>
                    <span className="text-slate-800 font-semibold text-right break-all max-w-[65%]">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Metrics Panels */}
            <div className="mb-6">
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-2.5 font-mono flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-blue-600 rounded-full"></span>
                [2.0] Execution Key Metrics
              </h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white border border-slate-200 hover:border-slate-350 p-4 rounded-lg shadow-xs flex flex-col justify-between items-start transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/10 group-hover:bg-blue-500/30 transition-colors"></div>
                    <div className="flex items-center justify-between w-full mb-3 select-none">
                      <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider">{stat.label}</span>
                      <div className="p-1.5 rounded-md bg-slate-50 border border-slate-100 text-slate-700 shrink-0">
                        {stat.icon}
                      </div>
                    </div>
                    <span className="text-lg font-black text-slate-950 font-mono tracking-tight">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Multi-Vector Simulation Breakdown */}
            {type === "unified" ? (
              <div className="space-y-6 mb-8">
                <h4 className="text-xs font-bold uppercase text-blue-700 tracking-wider font-mono">
                  [2.0] Simulation Module Audits Detail
                </h4>

                {/* Phishing section */}
                <div className="border border-slate-200 rounded p-4 bg-slate-50">
                  <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide font-mono mb-2">
                    [2.1] Social Engineering Phishing Assessment
                  </h5>
                  <p className="text-[10px] text-slate-600 mb-3 leading-relaxed">
                    Evaluates organization-wide susceptibility to spoofing tactics and password harvesting.
                  </p>

                  {/* Configuration inputs list */}
                  {data.phishingCampaigns && data.phishingCampaigns.length > 0 && (
                    <div className="mt-3 mb-4 select-none">
                      <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-2">
                        Compiled Campaign Configurations:
                      </span>
                      <div className="overflow-hidden border border-slate-200 rounded shadow-xs mb-3">
                        <table className="w-full text-[10px] text-slate-700 bg-white">
                          <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[8px] border-b border-slate-200 font-mono">
                            <tr>
                              <th className="px-3 py-2 text-left">Campaign Name</th>
                              <th className="px-3 py-2 text-left">Subject Line</th>
                              <th className="px-3 py-2 text-left">Template</th>
                              <th className="px-3 py-2 text-left">Date Created</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {data.phishingCampaigns.map((c, i) => (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 font-semibold text-slate-850">{c.name || `Campaign #${c.id}`}</td>
                                <td className="px-3 py-2 text-slate-600 truncate max-w-[180px]" title={c.subject}>{c.subject || "N/A"}</td>
                                <td className="px-3 py-2 text-slate-600 uppercase">{c.template || "N/A"}</td>
                                <td className="px-3 py-2 text-slate-500">
                                  {c.created_at ? new Date(c.created_at).toLocaleDateString() : "N/A"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Sent</span>
                      <span className="text-slate-800 font-bold">{data.phishing?.sent || 0}</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Opened</span>
                      <span className="text-slate-800 font-bold">{data.phishing?.opened || 0}</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Clicked</span>
                      <span className="text-slate-800 font-bold">{data.phishing?.clicked || 0}</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Captured</span>
                      <span className="text-slate-800 font-bold text-red-500">{data.phishing?.submitted || 0}</span>
                    </div>
                  </div>

                  {/* Detailed Recipient Intercept Log Table */}
                  {data.phishingDetails && data.phishingDetails.length > 0 && (
                    <div className="mt-4 border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-[10px] text-slate-700 bg-white">
                        <thead className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[8px] border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 text-left">Target Recipient</th>
                            <th className="px-3 py-2 text-left">Audit State</th>
                            <th className="px-3 py-2 text-left">Exfiltrated Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {data.phishingDetails.map((u, i) => {
                            let stateLabel = "SENT";
                            let stateColor = "text-slate-500 bg-slate-50";
                            if (u.submitted) {
                              stateLabel = "SUBMITTED CREDENTIALS";
                              stateColor = "text-red-600 bg-red-50";
                            } else if (u.clicked) {
                              stateLabel = "CLICKED LINK";
                              stateColor = "text-orange-600 bg-orange-50";
                            } else if (u.opened) {
                              stateLabel = "OPENED EMAIL";
                              stateColor = "text-amber-600 bg-amber-50";
                            }
                            return (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 font-semibold text-slate-800 truncate max-w-[200px]" title={u.email}>
                                  {u.email}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${stateColor}`}>
                                    {stateLabel}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-bold text-slate-900">
                                  {u.password ? (
                                    <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                      Password: {u.password}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">None Captured</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Bruteforce section */}
                <div className="border border-slate-200 rounded p-4 bg-slate-50">
                  <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide font-mono mb-2">
                    [2.2] Network Discovery & Dictionary Bruteforce Audit
                  </h5>
                  <p className="text-[10px] text-slate-600 mb-3 leading-relaxed">
                    Audits targeted host login interfaces against dictionary wordlists to check for weak administrative credentials.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Active Hosts Found</span>
                      <span className="text-slate-800 font-bold">{data.bruteforce?.hostsCount || 0}</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Attempts Checked</span>
                      <span className="text-slate-800 font-bold">{data.bruteforce?.attempts || 0}</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Cracked Logins</span>
                      <span className={`font-bold ${data.bruteforce?.breaches > 0 ? "text-red-500" : "text-emerald-500"}`}>
                        {data.bruteforce?.breaches > 0 ? "YES (CRITICAL)" : "NO"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sandbox section */}
                <div className="border border-slate-200 rounded p-4 bg-slate-50">
                  <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide font-mono mb-2">
                    [2.3] Behavioral Payload Sandbox Detonation
                  </h5>
                  <p className="text-[10px] text-slate-600 mb-3 leading-relaxed">
                    Monitors behavioral triggers and processes within a sandboxed virtual machine environment to trace file hazards.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Files Detonated</span>
                      <span className="text-slate-800 font-bold">{data.sandbox?.total || 0}</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Critical Events Flagged</span>
                      <span className="text-slate-800 font-bold text-red-500">{data.sandbox?.critical || 0}</span>
                    </div>
                  </div>
                </div>

                {/* DDoS section */}
                <div className="border border-slate-200 rounded p-4 bg-slate-50">
                  <h5 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide font-mono mb-2">
                    [2.4] Volumetric DDoS Stressor Traffic Audit
                  </h5>
                  <p className="text-[10px] text-slate-600 mb-3 leading-relaxed">
                    Applies massive request volumes to check target infrastructure response limits.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Flood Packets Sent</span>
                      <span className="text-slate-800 font-bold">{(data.ddos?.packets || 0).toLocaleString()}</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Spawned Threads</span>
                      <span className="text-slate-800 font-bold">{data.ddos?.threads || 4}</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded text-center">
                      <span className="text-[9px] text-slate-500 block">Attack Type</span>
                      <span className="text-slate-800 font-bold">{data.ddos?.type || "None"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-8">
                <h4 className="text-xs font-bold uppercase text-blue-700 tracking-wider mb-3 font-mono">
                  [2.5] Multi-Vector Simulation Breakdowns
                </h4>
                <div className="grid grid-cols-1 gap-2.5 bg-slate-50 border border-slate-200 p-4 rounded text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-150 pb-1.5 gap-4">
                    <span className="text-slate-500 font-medium shrink-0">Social Engineering Phishing:</span>
                    <span className="text-slate-800 font-semibold text-right">{totalTargets} targets engaged, {clickPct}% CTR, {submitPct}% harvest rate</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-150 pb-1.5 gap-4">
                    <span className="text-slate-500 font-medium shrink-0">Subnet Port Scanner:</span>
                    <span className="text-slate-800 font-semibold text-right">{statsObj.scanner_events || 0} scan queries executed</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-150 pb-1.5 gap-4">
                    <span className="text-slate-500 font-medium shrink-0">Administrative Bruteforce:</span>
                    <span className="text-slate-800 font-semibold text-right">{statsObj.bruteforce_events || 0} attempts checked</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-150 pb-1.5 gap-4">
                    <span className="text-slate-500 font-medium shrink-0">Malware Sandbox Detonation:</span>
                    <span className="text-slate-800 font-semibold text-right">{statsObj.sandbox_events || 0} binaries detonated</span>
                  </div>
                  <div className="flex justify-between pb-0.5 gap-4">
                    <span className="text-slate-500 font-medium shrink-0">Volumetric DDoS Stressor:</span>
                    <span className="text-slate-800 font-semibold text-right">{(statsObj.ddos_packets || 0).toLocaleString()} flood packets sent</span>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Log Grid / Table */}
            <div className="mb-8">
              <h4 className="text-xs font-bold uppercase text-blue-700 tracking-wider mb-3 font-mono">
                [3.0] Technical Detonation Records
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono">
                      <th className="p-3">Identity / Phase</th>
                      <th className="p-3">Engagement</th>
                      <th className="p-3">Audit Details</th>
                      <th className="p-3">Origin IP</th>
                      <th className="p-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500 font-mono">
                           NO ACTIVE LOGS REPORTED IN CURRENT REAL-TIME SNAPSHOT
                        </td>
                      </tr>
                    ) : (
                      logs.map((log, idx) => (
                        <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50/50 ${idx % 2 === 0 ? 'bg-slate-50/30' : ''}`}>
                          <td className="p-3 font-semibold font-mono text-slate-800">{log.col1}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              log.isCompromised
                                ? "bg-red-50 text-red-600"
                                : log.col2.includes("CLICK")
                                ? "bg-orange-50 text-orange-600"
                                : "bg-blue-50 text-blue-600"
                            }`}>
                              {log.col2}
                            </span>
                          </td>
                          <td className={`p-3 font-mono break-all ${log.isCompromised ? "text-red-600 font-semibold" : "text-slate-600"}`}>
                            {log.col3}
                          </td>
                          <td className="p-3 font-mono text-slate-600">{log.col4}</td>
                          <td className="p-3 text-slate-600">{log.col5}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conclusions and Recommendations */}
            {conclusions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-xs font-mono">
                {/* Conclusions */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg border-l-4 border-l-red-500 shadow-xs select-none">
                  <h4 className="text-[10px] font-bold uppercase text-red-700 tracking-wider mb-3 font-mono flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse"></span>
                    [4.0] Tactical Audit Conclusions
                  </h4>
                  <ul className="space-y-2 text-slate-650 text-[10px] list-disc pl-4 leading-relaxed">
                    {conclusions.map((c, idx) => (
                      <li key={idx} className="normal-case">{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg border-l-4 border-l-emerald-500 shadow-xs select-none">
                  <h4 className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider mb-3 font-mono flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span>
                    [5.0] Hardening Recommendations
                  </h4>
                  <ul className="space-y-2 text-slate-650 text-[10px] list-disc pl-4 leading-relaxed">
                    {recommendations.map((r, idx) => (
                      <li key={idx} className="normal-case">{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}



            {/* Footer Branding Info */}
            <div className="mt-12 pt-5 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>ROBLOCKSEC COMPLIANCE SYSTEMS VER. 3.4.1</span>
              <span className="mt-2 md:mt-0 select-none">CLASSIFIED CONFIDENTIAL SECURITY REPORT</span>
            </div>

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
