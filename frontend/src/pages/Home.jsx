import { useEffect, useState, useRef, useContext } from "react";
import { Link } from "react-router-dom";
import { Shield, Target, Box, AlertCircle, Building, Crosshair, Radar, TerminalSquare, ServerCrash, Play, FileText, Activity } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useSecurity } from "../context/SecurityContext";
import API from "../services/api";
import Chart from "../components/Chart";
import VectorRadar from "../components/VectorRadar";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ReportPreviewModal from "../components/ReportPreviewModal";

export default function Home() {
  const { user } = useContext(AuthContext);
  const { sandboxData, scannerData, ddosData, setDdosData, summaryData, setSummaryData } = useSecurity();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));

  const [campaigns, setCampaigns] = useState([]);
  const [reportSelectModal, setReportSelectModal] = useState({
    isOpen: false,
    actionType: "", // "preview"
    selectionType: "all", // "all" | "selected"
    tempSelectedIds: [],
  });
  const [compiledCampaignIds, setCompiledCampaignIds] = useState("all");
  const [compiledCampaigns, setCompiledCampaigns] = useState([]);
  const [notification, setNotification] = useState(null);

  const [cpuStress, setCpuStress] = useState(14);
  const [networkThru, setNetworkThru] = useState(0.05);

  useEffect(() => {
    const timer = setInterval(() => {
      const baseCpu = ddosData.isRunning ? 78 : 12;
      setCpuStress(Math.floor(baseCpu + Math.random() * 10));
      
      const baseThru = ddosData.isRunning ? 34.5 : 0.05;
      setNetworkThru(parseFloat((baseThru + Math.random() * 1.5).toFixed(2)));
    }, 1500);
    return () => clearInterval(timer);
  }, [ddosData.isRunning]);

  useEffect(() => {
    // Dynamic theme observer
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const fetchData = async () => {
      try {
        const [summaryRes, timelineRes, phishingDetailsRes, campaignsRes] = await Promise.all([
          API.get("/dashboard/summary"),
          API.get("/dashboard/timeline"),
          API.get("/dashboard/phishing/all/details"),
          API.get("/dashboard/campaigns")
        ]);
        
        const summary = summaryRes.data || {};
        const campaignsList = campaignsRes.data || [];
        setCampaigns(campaignsList);
        setCompiledCampaigns(campaignsList);
        
        // Populate DDoS packetCount from backend cache if not actively running
        if (summary.ddos_packets > 0 && !ddosData.isRunning) {
          setDdosData(prev => ({ ...prev, packetCount: summary.ddos_packets }));
        }

        setSummaryData(prev => ({
          ...prev,
          ...summary,
          phishing_details: phishingDetailsRes.data || []
        }));

        const timelineData = timelineRes.data || {};
        const formatted = Object.entries(timelineData).map(([date, count]) => ({
          date,
          count
        }));
        setTimeline(formatted);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      observer.disconnect();
    };
  }, [setSummaryData]);

  const bruteforceAttempts = scannerData.attackLogs.filter(log => log.includes('[PACKET]')).length;
  const bruteforceBreaches = scannerData.attackLogs.filter(log => log.includes('[!] SUCCESS')).length;
  const sandboxCritical = sandboxData.logs.filter(log => log.includes('[CRITICAL]')).length;

  const scoreDeductions = (summaryData.phishing_stats.submitted * 10) + (bruteforceBreaches * 20) + (sandboxCritical * 5);
  const securityScore = Math.max(0, 100 - scoreDeductions);
  
  let scoreColor = "text-emerald-500";
  let scoreBg = "bg-emerald-500";
  if (securityScore < 75) { scoreColor = "text-amber-500"; scoreBg = "bg-amber-500"; }
  if (securityScore < 50) { scoreColor = "text-red-500"; scoreBg = "bg-red-500"; }

  const generatePDF = () => {
    const doc = new jsPDF();
    const getNextY = (margin = 12, fallback = 25) => {
      if (doc.lastAutoTable && typeof doc.lastAutoTable.finalY === 'number') {
        return doc.lastAutoTable.finalY + margin;
      }
      return fallback;
    };
    
    // Theme colors matching ReportLab PDF style
    const NAVY = [11, 19, 43];
    const BLUE = [27, 78, 140];
    const RED = [217, 64, 64];
    const EMERALD = [16, 185, 129];
    const LIGHT_GREY = [248, 250, 252];
    const BORDER_GREY = [226, 232, 240];
    const TEXT_MAIN = [30, 41, 59];

    // Document Title & Organization Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text("COMPREHENSIVE AUDIT & THREAT REPORT", 14, 25);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const scopeLabel = compiledCampaignIds === "all" ? "ALL CAMPAIGNS" : `CAMPAIGN(S): ${compiledCampaignIds}`;
    doc.text(`GENERATE TIME: ${new Date().toLocaleString()} | TARGET ORG: ${(user?.name || "AUDIT").toUpperCase()} | SCOPE: ${scopeLabel}`, 14, 31);
    
    // Add threat rating score card
    const threatScore = ((100 - securityScore) / 10).toFixed(1);
    
    let threatLevel = "LOW";
    let colorRGB = EMERALD;
    let bgRGB = [236, 253, 245];
    if (parseFloat(threatScore) > 7.5) {
      threatLevel = "CRITICAL";
      colorRGB = RED;
      bgRGB = [254, 242, 242];
    } else if (parseFloat(threatScore) > 5.0) {
      threatLevel = "HIGH";
      colorRGB = [249, 115, 22]; // Orange
      bgRGB = [255, 247, 237];
    } else if (parseFloat(threatScore) > 2.0) {
      threatLevel = "MEDIUM";
      colorRGB = [234, 179, 8]; // Yellow
      bgRGB = [254, 252, 232];
    }

    doc.setFillColor(bgRGB[0], bgRGB[1], bgRGB[2]);
    doc.setDrawColor(colorRGB[0], colorRGB[1], colorRGB[2]);
    doc.rect(14, 38, doc.internal.pageSize.width - 28, 22, 'FD');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);
    doc.text(`${threatLevel} RISK LEVEL`, 18, 45);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text("Unified tactical command security score compiled across phishing, sandbox execution, network stress tests and bruteforce sweeps.", 18, 51, { maxWidth: doc.internal.pageSize.width - 60 });
    
    // Threat badge block
    const badgeX = doc.internal.pageSize.width - 14 - 18;
    doc.setFillColor(colorRGB[0], colorRGB[1], colorRGB[2]);
    doc.rect(badgeX, 42, 14, 14, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(threatScore.toString(), badgeX + 7, 51.5, { align: "center" });

    // Section 1.0: Audit Metadata
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text("1.0 Audit Summary Metadata", 14, 70);
    
    const metaRows = [
      ["Target Organization", user?.name || "Internal Directory"],
      ["Total Active Modules", "4 Simulation Suites"],
      ["Unified Threat Rating", `${threatScore} / 10.0 (CVSS Equivalent)`],
      ["Overall Security Posture", `${securityScore}% (Healthy Base)`],
      ["Capture Timeline Range", "Real-Time Operations Command Log"]
    ];

    autoTable(doc, {
      startY: 74,
      body: metaRows,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
    });

    // --- SECTION 2.0: PHISHING COMPLIANCE & SOCIAL ENGINEERING AUDIT ---
    let currentY = getNextY(12, 74);
    if (currentY > 220) {
      doc.addPage();
      currentY = 25;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text("2.0 Phishing Compliance & Social Engineering Audit", 14, currentY);
    currentY += 4;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    const phishDesc = "This section evaluates organizational susceptibility to external email spoofing and credential exfiltration. The simulated campaigns target user email addresses to record click-through actions and password submissions.";
    doc.text(phishDesc, 14, currentY, { maxWidth: doc.internal.pageSize.width - 28 });
    currentY += 10;

    const phishRows = [
      ["Emails Transmitted", `${summaryData.phishing_stats.sent} messages`],
      ["Emails Opened", `${summaryData.phishing_stats.opened} reads`],
      ["Links Clicked", `${summaryData.phishing_stats.clicked} link clicks`],
      ["Intercepted Credentials", `${summaryData.phishing_stats.submitted} harvested passwords`]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Phishing Metric', 'Audit Value / Observations']],
      body: phishRows,
      theme: 'grid',
      headStyles: { fillColor: BLUE, fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    // Configuration Inputs Table
    const configRows = compiledCampaigns.map((c, idx) => [
      idx + 1,
      c.name || `Campaign #${c.id}`,
      c.subject || "N/A",
      c.template ? c.template.toUpperCase() : "N/A",
      c.created_at ? new Date(c.created_at).toLocaleDateString() : "N/A"
    ]);

    if (configRows.length > 0) {
      currentY = getNextY(8, currentY);
      if (currentY > 220) {
        doc.addPage();
        currentY = 25;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
      doc.text("2.0.1 Phishing Campaign Configuration Inputs", 14, currentY);
      currentY += 4;

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Campaign Name', 'Email Subject Line', 'Template Theme', 'Created Date']],
        body: configRows,
        theme: 'grid',
        headStyles: { fillColor: BLUE, fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.5 }
      });
    }

    // Detailed recipient log list
    const detailRows = (summaryData.phishing_details || []).map((u, index) => {
      let status = "Sent";
      if (u.submitted) status = "Submitted Credentials";
      else if (u.clicked) status = "Clicked Link";
      else if (u.opened) status = "Opened Email";
      
      return [
        index + 1,
        u.email,
        status,
        u.password ? `CAPTURED (${u.password})` : "None Captured"
      ];
    });

    if (detailRows.length > 0) {
      currentY = getNextY(8, currentY);
      if (currentY > 220) {
        doc.addPage();
        currentY = 25;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
      doc.text("2.1 Detailed Phishing Recipient Intercept Log", 14, currentY);
      currentY += 4;

      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Target Email', 'Engagement Status', 'Exfiltrated Credentials']],
        body: detailRows,
        theme: 'grid',
        headStyles: { fillColor: NAVY, fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        columnStyles: { 0: { width: 10 }, 1: { fontStyle: 'bold' } }
      });
    }

    // --- SECTION 3.0: SUBNET DISCOVERY & DICTIONARY BRUTEFORCE AUDIT ---
    currentY = getNextY(12, currentY);
    if (currentY > 220) {
      doc.addPage();
      currentY = 25;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text("3.0 Network Discovery & Dictionary Bruteforce Audit", 14, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    const bfDesc = "This module audits administrative remote access login panels (SSH, Database connections) by scanning targeted subnets for active endpoints and applying automated credential wordlists.";
    doc.text(bfDesc, 14, currentY, { maxWidth: doc.internal.pageSize.width - 28 });
    currentY += 10;

    const bfRows = [
      ["Active Targets Found", `${scannerData.liveHosts.length} live host IP(s)`],
      ["Dictionary Trials Checked", `${scannerData.attackLogs.length} attempts`],
      ["Admin Logins Cracked", bruteforceBreaches > 0 ? "YES (CRITICAL COMPROMISE)" : "NO (COMPLIANT)"]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Bruteforce Metric', 'Audit Value / Observations']],
      body: bfRows,
      theme: 'grid',
      headStyles: { fillColor: BLUE, fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    // --- SECTION 4.0: BEHAVIORAL PAYLOAD SANDBOX DETONATION ---
    currentY = getNextY(12, currentY);
    if (currentY > 220) {
      doc.addPage();
      currentY = 25;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text("4.0 Behavioral Malware Sandbox Detonation", 14, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    const sbDesc = "Determines malicious potential of untrusted binaries by executing them inside a secure guest virtual machine sandbox and monitoring process injections, registry hooks, and network sockets.";
    doc.text(sbDesc, 14, currentY, { maxWidth: doc.internal.pageSize.width - 28 });
    currentY += 10;

    const sbRows = [
      ["Executable Files Detonated", `${summaryData.sandbox_events || 0} binaries`],
      ["Critical Security Flags", `${sandboxCritical} alerts triggered`]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Sandbox Heuristics Metric', 'Audit Value / Observations']],
      body: sbRows,
      theme: 'grid',
      headStyles: { fillColor: BLUE, fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    // --- SECTION 5.0: NETWORK STRESSOR & VOLUMETRIC DDOS AUDIT ---
    currentY = getNextY(12, currentY);
    if (currentY > 220) {
      doc.addPage();
      currentY = 25;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text("5.0 Volumetric DDoS Stressor Traffic Audit", 14, currentY);
    currentY += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    const ddosDesc = "Validates the reliability and load limit capacity of local target endpoints under massive request storms (HTTP/TCP flooding streams).";
    doc.text(ddosDesc, 14, currentY, { maxWidth: doc.internal.pageSize.width - 28 });
    currentY += 10;

    const ddosRows = [
      ["Flood Packet Volumetrics", `${ddosData.packetCount.toLocaleString()} request packets`],
      ["Spawned Execution Threads", `${ddosData.threads || 4} worker threads`],
      ["Attack Stress Vector Mode", `${ddosData.attackType || "None"}`]
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['DDoS Stressor Metric', 'Audit Value / Observations']],
      body: ddosRows,
      theme: 'grid',
      headStyles: { fillColor: BLUE, fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    // --- SECTION 6.0: CONSOLIDATED SECURITY OPERATIONS LOG STREAM ---
    currentY = getNextY(12, currentY);
    if (currentY > 220) {
      doc.addPage();
      currentY = 25;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.text("6.0 Consolidated Security Operations Log Stream", 14, currentY);
    currentY += 4;

    const logRows = (summaryData.live_logs || []).map((log, index) => {
      let moduleName = "SYSTEM";
      if (log.includes('[PHISHING]')) moduleName = "PHISHING";
      if (log.includes('[BRUTEFORCE]')) moduleName = "BRUTEFORCE";
      if (log.includes('[SANDBOX]')) moduleName = "SANDBOX";
      if (log.includes('[DDOS]')) moduleName = "DDOS";

      return [
        index + 1,
        moduleName,
        log.replace(/\[.*?\]\s*/g, ""),
        "Command Center Stream"
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Event', 'Simulation Origin', 'Audit Log Details', 'Capture Source']],
      body: logRows.slice(0, 30),
      theme: 'grid',
      headStyles: { fillColor: NAVY, fontSize: 8.5 },
      styles: { fontSize: 7.5, cellPadding: 3 },
      columnStyles: { 0: { width: 15 }, 1: { fontStyle: 'bold', width: 35 } }
    });

    // Page decorations loop
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Background watermark
      if (typeof doc.saveGraphicsState === "function" && doc.GState) {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.03 }));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(45);
        doc.setTextColor(100, 116, 139);
        doc.text("ROBLOCKSEC", doc.internal.pageSize.width/2, doc.internal.pageSize.height/2, { align: 'center', angle: 30 });
        doc.restoreGraphicsState();
      } else {
        // Fallback for environments where graphics state management is not loaded
        doc.setFont("helvetica", "bold");
        doc.setFontSize(45);
        doc.setTextColor(240, 240, 240); // static light color fallback
        doc.text("ROBLOCKSEC", doc.internal.pageSize.width/2, doc.internal.pageSize.height/2, { align: 'center', angle: 30 });
      }

      // Top running header line (only pages > 1)
      if (i > 1) {
        doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
        doc.setLineWidth(0.5);
        doc.line(14, 15, doc.internal.pageSize.width - 14, 15);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
        doc.text("SECURITY COMPLIANCE SYSTEMS // OPERATIONS COMMAND CENTER", 14, 12);
      }

      // Bottom running footer (all pages)
      doc.setDrawColor(BORDER_GREY[0], BORDER_GREY[1], BORDER_GREY[2]);
      doc.setLineWidth(0.5);
      doc.line(14, doc.internal.pageSize.height - 15, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("AUDIT ENGINE: COMPREHENSIVE COMMAND SECURITY OPERATIONS REPORT", 14, doc.internal.pageSize.height - 10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: "right" });
    }

    const companyName = (user?.name || "audit").replace(/\s+/g, "_").toLowerCase();
    doc.save(`roblocksec_unified_${companyName}_report.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[80vh] bg-transparent">
        <div className="relative flex justify-center items-center">
            <div className="absolute animate-ping w-16 h-16 rounded-full bg-blue-500/20"></div>
            <Shield className="text-blue-500 animate-pulse z-10" size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-[var(--bg-base)] min-h-screen text-[var(--text-secondary)] relative">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-[var(--border)] gap-6 select-none">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1 bg-[var(--accent-dim)] rounded border border-[var(--accent-blue)]/20">
              <Building size={12} className="text-[var(--accent-blue)]" />
            </div>
            <span className="uppercase tracking-widest text-[10px] font-black text-[var(--accent-blue)] bg-[var(--accent-dim)] px-2.5 py-1 rounded border border-[var(--accent-blue)]/20">{user?.name} SEC OPS</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <Shield className="text-[var(--accent-blue)]" size={32} />
            Operations Command Center
          </h1>
          <p className="text-[var(--text-secondary)] mt-1.5 text-xs font-mono">Unified monitoring and real-time cybersecurity simulation orchestrator.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              try {
                const res = await API.get("/dashboard/campaigns");
                const list = res.data || [];
                setCampaigns(list);
                setReportSelectModal({
                  isOpen: true,
                  actionType: "preview",
                  selectionType: compiledCampaignIds === "all" ? "all" : "selected",
                  tempSelectedIds: compiledCampaignIds !== "all" && compiledCampaignIds ? compiledCampaignIds.split(",") : [],
                });
              } catch (err) {
                console.error("Fetch Campaigns Error:", err);
              }
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded transition-all cursor-pointer shadow-md active:scale-95 border border-transparent font-mono uppercase tracking-wider"
          >
            <FileText size={14} /> Generate Report
          </button>
          
          <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border)] px-4 py-2.5 rounded-lg shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[var(--text-primary)] text-xs font-bold font-mono tracking-wide">SEC_OPS // MONITOR_ACTIVE</span>
          </div>
        </div>
      </div>

      {/* 🔹 BALANCED OPERATIONS DASHBOARD GRID */}
      <div className="space-y-6">
        
        {/* ROW 1: SYSTEM MONITOR HUD & TIMELINE GRAPH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Status HUD Control Board (col-span-4) */}
          <div className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border)] border-l-4 border-l-blue-600 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5 select-none">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">SYSTEM INSTANCE STATE</span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold font-mono tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE
              </span>
            </div>

            <div className="flex items-center gap-5 my-3">
              <div className="relative flex items-center justify-center p-3.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl shrink-0">
                <Shield className={`${scoreColor} animate-pulse`} size={42} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block font-mono">Security Posture</span>
                <span className={`text-4xl font-black ${scoreColor} tracking-tight block mt-0.5`}>{securityScore}%</span>
                <span className="text-xs text-[var(--text-secondary)] font-mono">
                  {securityScore >= 75 ? "Stable margins." : securityScore >= 50 ? "Advisory warnings." : "High threats flagged."}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-b border-[var(--border)] py-4 font-mono text-xs">
              <div>
                <span className="text-[var(--text-muted)] block uppercase font-bold text-[10px]">SIMULATION LOAD</span>
                <span className="text-emerald-500 font-bold uppercase tracking-wider block mt-1">NORMAL</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block uppercase font-bold text-[10px]">TOTAL EVENTS</span>
                <span className="text-[var(--text-primary)] font-bold block mt-1">{summaryData.total_events}</span>
              </div>
            </div>

            <div className="flex justify-between text-xs items-center pt-2 gap-4">
              <span className="text-[var(--text-secondary)] font-mono truncate">Active Campaign:</span>
              <span className="font-bold text-[var(--text-primary)] bg-[var(--bg-elevated)] px-2.5 py-1 rounded border border-[var(--border)] font-mono truncate max-w-[150px]" title={summaryData.active_campaign || "None"}>
                {summaryData.active_campaign ? `🟢 ${summaryData.active_campaign}` : "None"}
              </span>
            </div>
          </div>

          {/* Real-time System Monitor HUD Card (col-span-8) */}
          <div className="lg:col-span-8 p-6 rounded-xl border border-[var(--border)] border-l-4 border-l-blue-600 bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between min-h-[300px]">
            <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-2.5 select-none">
               <div className="flex items-center gap-2">
                  <Activity size={16} className="text-blue-500 animate-pulse" />
                  <span className="text-xs font-black uppercase text-[var(--text-primary)] tracking-wider font-mono">System Monitor & Telemetry</span>
               </div>
               <span className="text-[10px] text-emerald-500 font-mono font-bold animate-pulse">● LIVE PROBE FEED</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              {/* Left Column: Resource Health Gauges */}
              <div className="space-y-4 flex flex-col justify-center">
                {/* CPU Thread */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-[var(--text-secondary)] font-bold">CPU Simulation Thread</span>
                    <span className="text-blue-500 font-bold">{cpuStress}%</span>
                  </div>
                  <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${cpuStress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Memory Buffer */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-[var(--text-secondary)] font-bold">Sandbox Memory Buffer</span>
                    <span className="text-purple-500 font-bold">38.4%</span>
                  </div>
                  <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                    <div 
                      className="bg-purple-500 h-full rounded-full"
                      style={{ width: "38.4%" }}
                    ></div>
                  </div>
                </div>

                {/* Attack Node Probe */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-[var(--text-secondary)] font-bold">Active Probe Threads</span>
                    <span className="text-orange-500 font-bold">{ddosData.isRunning || scannerData.isAttacking ? "42 Threads" : "12 Idle"}</span>
                  </div>
                  <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                    <div 
                      className="bg-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: ddosData.isRunning || scannerData.isAttacking ? "80%" : "30%" }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Network Telemetry Cards */}
              <div className="grid grid-cols-2 gap-3.5 select-none">
                <div className="bg-[var(--bg-elevated)] border border-[var(--border)] p-3.5 rounded-lg flex flex-col justify-between">
                  <span className="text-[9px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider">Breach Agent</span>
                  <div>
                    <span className="text-xs font-bold text-emerald-500 font-mono block mt-1">ONLINE</span>
                    <span className="text-[9.5px] text-[var(--text-muted)] font-mono block mt-0.5">ID: BS-AGENT-09</span>
                  </div>
                </div>

                <div className="bg-[var(--bg-elevated)] border border-[var(--border)] p-3.5 rounded-lg flex flex-col justify-between">
                  <span className="text-[9px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider">Bandwidth</span>
                  <div>
                    <span className="text-xs font-bold text-blue-500 font-mono block mt-1">{networkThru} MB/s</span>
                    <span className="text-[9.5px] text-[var(--text-muted)] font-mono block mt-0.5">Stress Load</span>
                  </div>
                </div>

                <div className="bg-[var(--bg-elevated)] border border-[var(--border)] p-3.5 rounded-lg flex flex-col justify-between">
                  <span className="text-[9px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider">Target Subnet</span>
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)] font-mono block mt-1 truncate" title="192.168.29.0/24">192.168.29.0/24</span>
                    <span className="text-[9.5px] text-[var(--text-muted)] font-mono block mt-0.5">Active Target Range</span>
                  </div>
                </div>

                <div className="bg-[var(--bg-elevated)] border border-[var(--border)] p-3.5 rounded-lg flex flex-col justify-between">
                  <span className="text-[9px] font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider">Total Packets</span>
                  <div>
                    <span className="text-xs font-bold text-orange-500 font-mono block mt-1 truncate">
                      {(summaryData.ddos_packets || ddosData.packetCount).toLocaleString()}
                    </span>
                    <span className="text-[9.5px] text-[var(--text-muted)] font-mono block mt-0.5">Stress Packets</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ROW 2: SHUTTLE CARD CONTROLS, TERMINAL LOGS & MOVEMENT RADAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Module Links List (col-span-4) */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phishing */}
            <Link to="/phishing" className="p-3.5 rounded-lg border border-[var(--border)] border-l-4 border-l-blue-600 bg-[var(--bg-surface)] hover:border-[var(--border-bright)] transition-all cursor-pointer hover:shadow-md flex flex-col justify-between h-[132px]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 uppercase font-mono">
                  <Crosshair size={12} className="text-blue-500"/> Phishing
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono ${summaryData.active_campaign ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse" : "bg-slate-500/10 text-[var(--text-secondary)] border border-slate-500/20"}`}>
                  {summaryData.active_campaign ? "Live" : "Stopped"}
                </span>
              </div>
              <div className="space-y-0.5 font-mono text-[11px] flex-1 mt-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Sent</span>
                  <span className="font-bold text-[var(--text-primary)]">{summaryData.phishing_stats.sent || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Opened</span>
                  <span className="font-bold text-[var(--text-primary)]">{summaryData.phishing_stats.opened}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Captured</span>
                  <span className="font-bold text-red-500">{summaryData.phishing_stats.submitted}</span>
                </div>
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] border-t border-[var(--border)]/50 pt-1 mt-1">
                  <span className="truncate max-w-[60px]">Campaign</span>
                  <span className="font-bold text-[var(--text-primary)] truncate max-w-[90px]" title={summaryData.active_campaign || summaryData.latest_campaign}>
                    {summaryData.active_campaign ? `🟢 ${summaryData.active_campaign}` : `⚪ ${summaryData.latest_campaign}`}
                  </span>
                </div>
              </div>
            </Link>

            {/* Bruteforce */}
            <Link to="/bruteforce" className="p-3.5 rounded-lg border border-[var(--border)] border-l-4 border-l-orange-500 bg-[var(--bg-surface)] hover:border-[var(--border-bright)] transition-all cursor-pointer hover:shadow-md flex flex-col justify-between h-[132px]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 uppercase font-mono">
                  <AlertCircle size={12} className="text-orange-500"/> Bruteforce
                </span>
                {scannerData.isAttacking && <span className="text-[9px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded border border-orange-500/20 font-bold animate-pulse uppercase font-mono">Run</span>}
              </div>
              <div className="space-y-1 font-mono text-[11px] flex-1 mt-2">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Swept</span>
                  <span className="font-bold text-[var(--text-primary)]">{scannerData.liveHosts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Breaches</span>
                  <span className="font-bold text-red-500">{bruteforceBreaches}</span>
                </div>
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] border-t border-[var(--border)]/50 pt-1 mt-1">
                  <span className="truncate max-w-[60px]">Target</span>
                  <span className="font-bold text-[var(--text-primary)] truncate max-w-[90px]" title={scannerData.lockedTarget || scannerData.targetRange}>
                    {scannerData.lockedTarget || scannerData.targetRange || "None"}
                  </span>
                </div>
              </div>
            </Link>

            {/* Sandbox */}
            <Link to="/sandbox" className="p-3.5 rounded-lg border border-[var(--border)] border-l-4 border-l-purple-500 bg-[var(--bg-surface)] hover:border-[var(--border-bright)] transition-all cursor-pointer hover:shadow-md flex flex-col justify-between h-[132px]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 uppercase font-mono">
                  <Box size={12} className="text-purple-500"/> Sandbox
                </span>
                {sandboxData.isRunning && <span className="text-[9px] bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded border border-purple-500/20 font-bold animate-pulse uppercase font-mono">Run</span>}
              </div>
              <div className="space-y-1 font-mono text-[11px] flex-1 mt-2">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Detonated</span>
                  <span className="font-bold text-[var(--text-primary)]">{summaryData.sandbox_events || (sandboxData.isRunning ? 1 : 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Criticals</span>
                  <span className="font-bold text-red-500">{sandboxCritical}</span>
                </div>
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] border-t border-[var(--border)]/50 pt-1 mt-1">
                  <span className="truncate max-w-[60px]">Payload</span>
                  <span className="font-bold text-[var(--text-primary)] truncate max-w-[90px]" title={summaryData.last_detonated_file}>
                    {summaryData.last_detonated_file}
                  </span>
                </div>
              </div>
            </Link>

            {/* DDoS */}
            <Link to="/ddos" className="p-3.5 rounded-lg border border-[var(--border)] border-l-4 border-l-red-500 bg-[var(--bg-surface)] hover:border-[var(--border-bright)] transition-all cursor-pointer hover:shadow-md flex flex-col justify-between h-[132px]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-1.5">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 uppercase font-mono">
                  <ServerCrash size={12} className="text-red-500"/> Stressor
                </span>
                {ddosData.isRunning && <span className="text-[9px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20 font-bold animate-pulse uppercase font-mono">Run</span>}
              </div>
              <div className="space-y-1 font-mono text-[11px] flex-1 mt-2">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Traffic</span>
                  <span className="font-bold text-[var(--text-primary)]">{ddosData.packetCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Type</span>
                  <span className="font-bold text-red-500 truncate max-w-[70px]" title={ddosData.attackType}>{ddosData.attackType || "None"}</span>
                </div>
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] border-t border-[var(--border)]/50 pt-1 mt-1">
                  <span className="truncate max-w-[60px]">Host Target</span>
                  <span className="font-bold text-[var(--text-primary)] truncate max-w-[90px]" title={ddosData.targetIp || ddosData.url}>
                    {ddosData.targetIp || (ddosData.url ? ddosData.url.replace("http://", "").replace("https://", "").split("/")[0] : "None")}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Security Hardening Recommendations (col-span-4) */}
          <div className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border)] border-l-4 border-l-orange-500 shadow-sm p-6 rounded-xl flex flex-col justify-between h-[280px] font-mono">
              <div className="flex items-center gap-3 mb-3 pb-2 border-b border-[var(--border)] select-none">
                  <span className="text-xs font-black uppercase text-[var(--text-primary)] tracking-widest flex items-center gap-2">
                      <Shield className="text-orange-500" size={16}/> Mitigation Advisories
                  </span>
                  <span className="ml-auto text-[9px] text-orange-500 uppercase font-bold tracking-widest bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                      SECURE
                  </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2.5 text-xs pr-1.5 scrollbar-thin scrollbar-thumb-[var(--border)]">
                  {summaryData.phishing_stats.submitted > 0 ? (
                      <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500">
                          <span className="font-bold block mb-1">⚠️ [PHISHING DEFEAT]</span>
                          Enforce WebAuthn (FIDO2) key authentication to prevent credential phishing.
                      </div>
                  ) : (
                      <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                          <span className="font-bold block mb-1">✅ [PHISHING SAFE]</span>
                          No active credential harvest bypasses registered.
                      </div>
                  )}

                  {bruteforceBreaches > 0 ? (
                      <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500">
                          <span className="font-bold block mb-1">⚠️ [BRUTEFORCE BREACH]</span>
                          Implement SSH fail2ban locking rules and disable password logins.
                      </div>
                  ) : (
                      <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                          <span className="font-bold block mb-1">✅ [PORT SCAN SAFE]</span>
                          No host directory brute-force breach signatures.
                      </div>
                  )}

                  {sandboxCritical > 0 ? (
                      <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500">
                          <span className="font-bold block mb-1">⚠️ [MALWARE DETONATION]</span>
                          Enable AMSI code-script monitoring and restrict Powershell.
                      </div>
                  ) : (
                      <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                          <span className="font-bold block mb-1">✅ [EDR HOST SAFE]</span>
                          Zero execution heuristics anomalies detonated.
                      </div>
                  )}

                  {ddosData.packetCount > 1000 ? (
                      <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-500">
                          <span className="font-bold block mb-1">⚠️ [VOLUMETRIC FLOOD]</span>
                          Provision Cloudflare Magic Transit to absorb packet storms.
                      </div>
                  ) : (
                      <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                          <span className="font-bold block mb-1">✅ [NETWORK TRAFFIC NORMAL]</span>
                          Outbound stress latency within baseline parameters.
                      </div>
                  )}
              </div>
          </div>

          {/* Threat Vector Distribution & Engine status (col-span-4) */}
          <div className="lg:col-span-4 p-6 rounded-xl border border-[var(--border)] border-l-4 border-l-blue-600 bg-[var(--bg-surface)] shadow-sm flex flex-col justify-between h-[280px]">
             <div className="flex items-center justify-between mb-3 border-b border-[var(--border)] pb-2.5 select-none">
                <h2 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 uppercase tracking-wider font-mono">
                  <Target className="text-blue-500" size={14} /> Threat Vector Analysis
                </h2>
             </div>
             
             <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Radar Chart */}
                <div className="h-[200px] w-full flex items-center justify-center">
                   <VectorRadar darkTheme={isDark} data={[
                     { subject: 'Phishing', A: (summaryData.phishing_stats.submitted * 2) + 15, fullMark: 100 },
                     { subject: 'Bruteforce', A: (bruteforceBreaches * 5) + 20, fullMark: 100 },
                     { subject: 'Sandbox', A: (sandboxCritical * 5) + 25, fullMark: 100 },
                     { subject: 'Network Payload', A: ddosData.packetCount > 0 ? 80 : 35, fullMark: 100 },
                     { subject: 'Hardware Injection', A: 20, fullMark: 100 }
                   ]} />
                </div>
                
                {/* Engine status Checklist */}
                <div className="space-y-2 border-l border-[var(--border)] pl-4 h-[180px] flex flex-col justify-center font-mono">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider block mb-1">Checklist</span>
                  <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-[80px]">Phishing</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active"></span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-[80px]">Bruteforce</span>
                      <span className={`w-2 h-2 rounded-full ${scannerData.isAttacking ? "bg-emerald-500 animate-pulse" : "bg-slate-350 dark:bg-slate-700"}`}></span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-[80px]">Sandbox</span>
                      <span className={`w-2 h-2 rounded-full ${sandboxData.isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-350 dark:bg-slate-700"}`}></span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="truncate max-w-[80px]">Stressor</span>
                      <span className={`w-2 h-2 rounded-full ${ddosData.isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-350 dark:bg-slate-700"}`}></span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

        </div>

      </div>
      
      {notification && (
        <div className="fixed bottom-6 left-6 z-[60] w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5 shadow-2xl font-mono text-xs text-[var(--text-primary)]">
          <div className="flex justify-between items-start mb-2.5 border-b border-[var(--border)] pb-2 select-none">
            <h4 className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${notification.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
              {notification.type === 'success' ? '✓ ' : '✕ '}{notification.title}
            </h4>
            <button onClick={() => setNotification(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-[9px] font-bold cursor-pointer">✕</button>
          </div>
          <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed normal-case break-all">
            {notification.message}
          </p>
        </div>
      )}

      {reportSelectModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl relative font-mono select-none">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase text-[var(--text-primary)] tracking-widest">
                Select Audit Campaigns
              </h3>
              <button 
                onClick={() => setReportSelectModal(prev => ({ ...prev, isOpen: false }))} 
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-[var(--text-primary)]">
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Choose whether you wish to aggregate all historical simulation campaigns or compile a report for selected ones:
              </p>
              
              <div className="flex gap-4 p-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg">
                <label className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md cursor-pointer select-none text-xs font-semibold transition-all border ${
                  reportSelectModal.selectionType === "all" 
                    ? "bg-blue-500/15 border-blue-500/30 text-blue-500" 
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}>
                  <input
                    type="radio"
                    name="reportSelectionType"
                    checked={reportSelectModal.selectionType === "all"}
                    onChange={() => setReportSelectModal(prev => ({ ...prev, selectionType: "all" }))}
                    className="accent-blue-500 cursor-pointer"
                  />
                  <span>All Campaigns</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md cursor-pointer select-none text-xs font-semibold transition-all border ${
                  reportSelectModal.selectionType === "selected" 
                    ? "bg-blue-500/15 border-blue-500/30 text-blue-500" 
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}>
                  <input
                    type="radio"
                    name="reportSelectionType"
                    checked={reportSelectModal.selectionType === "selected"}
                    onChange={() => setReportSelectModal(prev => ({ ...prev, selectionType: "selected" }))}
                    className="accent-blue-500 cursor-pointer"
                  />
                  <span>Selected Ones</span>
                </label>
              </div>

              {reportSelectModal.selectionType === "selected" && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-[var(--border)] rounded-lg p-2.5 bg-[var(--bg-elevated)] divide-y divide-[var(--border)]">
                  {campaigns.map((c) => {
                    const isChecked = reportSelectModal.tempSelectedIds.includes(String(c.id));
                    return (
                      <label key={c.id} className="flex items-center gap-3 py-2 cursor-pointer select-none text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setReportSelectModal(prev => {
                              const ids = prev.tempSelectedIds.includes(String(c.id))
                                ? prev.tempSelectedIds.filter(id => id !== String(c.id))
                                : [...prev.tempSelectedIds, String(c.id)];
                              return { ...prev, tempSelectedIds: ids };
                            });
                          }}
                          className="accent-blue-500 rounded border-[var(--border-bright)] cursor-pointer"
                        />
                        <div className="flex-1 flex justify-between items-center pr-1">
                          <span className="font-semibold">{c.name || `Campaign #${c.id}`}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono">Status: {c.status}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setReportSelectModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 bg-[var(--bg-elevated)] hover:bg-[var(--accent-dim)] border border-[var(--border-bright)] text-[var(--text-primary)] hover:text-red-500 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  let targetId = "";
                  let targetCampaignsList = [];
                  if (reportSelectModal.selectionType === "all") {
                    targetId = "all";
                    targetCampaignsList = campaigns;
                  } else {
                    if (reportSelectModal.tempSelectedIds.length === 0) {
                      setNotification({
                        type: "error",
                        title: "Selection Required",
                        message: "Please select at least one campaign."
                      });
                      return;
                    }
                    targetId = reportSelectModal.tempSelectedIds.join(",");
                    targetCampaignsList = campaigns.filter(c => reportSelectModal.tempSelectedIds.includes(String(c.id)));
                  }
                  
                  // Close this modal
                  setReportSelectModal(prev => ({ ...prev, isOpen: false }));
                  
                  // Fetch the aggregated summary stats
                  try {
                    const [summaryRes, detailsRes] = await Promise.all([
                      API.get(`/dashboard/summary?campaign_ids=${targetId}`),
                      API.get(`/dashboard/phishing/${targetId}/details`)
                    ]);
                    setSummaryData(prev => ({
                      ...prev,
                      ...summaryRes.data,
                      phishing_details: detailsRes.data || []
                    }));
                    setCompiledCampaigns(targetCampaignsList);
                    setCompiledCampaignIds(targetId);
                    setIsPreviewOpen(true);
                  } catch (err) {
                    console.error("Fetch Aggregated Summary Error:", err);
                    setNotification({
                      type: "error",
                      title: "Sync Failed",
                      message: "Failed to compile summary stats for the selected campaigns."
                    });
                  }
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Confirm & Generate
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        type="unified"
        data={{
          phishing: summaryData.phishing_stats,
          phishingDetails: summaryData.phishing_details,
          phishingCampaigns: compiledCampaigns,
          bruteforce: {
            attempts: scannerData.attackLogs.length,
            breaches: bruteforceBreaches,
            hostsCount: scannerData.liveHosts.length
          },
          sandbox: {
            total: summaryData.sandbox_events || 0,
            critical: sandboxCritical
          },
          ddos: {
            packets: ddosData.packetCount,
            type: ddosData.attackType || "None",
            elapsed: ddosData.elapsed
          },
          securityScore: securityScore,
          liveLogs: summaryData.live_logs
        }}
        onDownload={generatePDF}
      />

    </div>
  );
}