import React, { useEffect, useRef, useState, useContext } from 'react';
import API from '../services/api';
import { useSecurity } from '../context/SecurityContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
    Zap, ServerCrash, Activity, Download, TerminalSquare, 
    ShieldAlert, Target, Globe, Cpu, Timer, Radio, ClipboardList, CheckCircle2, Eye
} from 'lucide-react';
import NpcapCheckModal from '../components/NpcapCheckModal';
import CustomSelect from '../components/CustomSelect';
import ReportPreviewModal from '../components/ReportPreviewModal';
import { AuthContext } from '../context/AuthContext';

const SPEED_LABELS = ["Unlimited", "Fast", "Medium", "Slow", "Very Slow"];
const SPEED_DELAYS = [0, 0.001, 0.01, 0.1, 0.5];

const Ddos = () => {
    const { user } = useContext(AuthContext);
    const { ddosData, setDdosData } = useSecurity();
    const socketRef = useRef(null);

    // Local LOIC config state
    const [port, setPort] = useState(80);
    const [speedIndex, setSpeedIndex] = useState(0);
    const [threads, setThreads] = useState(1);
    const [customPayload, setCustomPayload] = useState('');
    const [randomPayload, setRandomPayload] = useState(false);
    const [subsite, setSubsite] = useState('/');
    const [waitForReply, setWaitForReply] = useState(false);

    // Npcap dynamic checks
    const [npcapEnabled, setNpcapEnabled] = useState(true);
    const [npcapDetected, setNpcapDetected] = useState(null);
    const [npcapModalOpen, setNpcapModalOpen] = useState(false);
    const [forceNpcapCheck, setForceNpcapCheck] = useState(false);

    // Attack session snapshot & report
    const [attackSession, setAttackSession] = useState(null);
    const [attackReport, setAttackReport] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const attackStartTime = useRef(null);

    useEffect(() => {
        const checkNpcap = async () => {
            const checkedBefore = sessionStorage.getItem("npcap_checked") === "true";
            if (!checkedBefore) {
                setNpcapModalOpen(true);
            } else {
                const savedDetected = sessionStorage.getItem("npcap_detected") === "true";
                setNpcapDetected(savedDetected);
                setNpcapEnabled(savedDetected);
            }
        };
        checkNpcap();

    }, []);

    useEffect(() => {
        // When attack ends (active becomes false), generate the report
        if (!ddosData.isRunning && attackStartTime.current) {
            const elapsed = Math.round((Date.now() - attackStartTime.current) / 1000);
            setAttackReport(session => ({
                ...session,
                endTime: new Date().toLocaleTimeString(),
                elapsed,
                finalCount: ddosData.packetCount,
                lastMessage: "Attack terminated by operator.",
            }));
            attackStartTime.current = null;
        }
    }, [ddosData.isRunning, ddosData.packetCount]);

    const handleNpcapDetected = (detected) => {
        setNpcapDetected(detected);
        setNpcapEnabled(detected);
    };

    const handleResolve = async () => {
        if (!ddosData.url) return;
        try {
            const res = await API.get(`/ddos/resolve?url=${encodeURIComponent(ddosData.url)}`);
            setDdosData(prev => ({ ...prev, targetIp: res.data.ip }));
        } catch (err) {
            setDdosData(prev => ({ ...prev, logs: [`[ERROR] DNS Resolution Failed`, ...prev.logs] }));
        }
    };

    const handleExecute = async () => {
        if (!ddosData.targetIp) {
            setDdosData(prev => ({ ...prev, logs: [`[ERROR] Resolve a target first.`, ...prev.logs] }));
            return;
        }
        const payload = randomPayload
            ? Math.random().toString(36).repeat(8)
            : customPayload;

        // Snapshot the session for the report
        const session = {
            target: ddosData.targetIp,
            host: ddosData.url || ddosData.targetIp,
            attackType: ddosData.attackType,
            port: parseInt(port),
            threads: parseInt(threads),
            duration: parseInt(ddosData.duration),
            speed: SPEED_LABELS[speedIndex],
            subsite: subsite || '/',
            waitForReply,
            startTime: new Date().toLocaleTimeString(),
        };
        setAttackSession(session);
        setAttackReport(null); // Clear previous report
        attackStartTime.current = Date.now();

        setDdosData(prev => ({
            ...prev,
            isRunning: true,
            packetCount: 0,
            logs: [`[SYSTEM] Initiating ${prev.attackType} sequence on ${prev.targetIp}:${port}...`]
        }));

        try {
            await API.post('/ddos/execute', {
                target_ip: ddosData.targetIp,
                attack_type: ddosData.attackType,
                duration: parseInt(ddosData.duration),
                port: parseInt(port),
                threads: parseInt(threads),
                speed_delay: SPEED_DELAYS[speedIndex],
                custom_payload: payload,
                subsite: subsite || '/',
                wait_for_reply: waitForReply,
            });
        } catch (err) {
            setDdosData(prev => ({ ...prev, isRunning: false, logs: [`[CRITICAL] Execution Failed: ${err.message}`, ...prev.logs] }));
        }
    };

    const handleStop = async () => {
        try {
            await API.post('/ddos/stop');
            setDdosData(prev => ({ ...prev, isRunning: false }));
        } catch (err) {
            setDdosData(prev => ({ ...prev, logs: [`[ERROR] Stop command failed`, ...prev.logs] }));
        }
    };

    const loadImage = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
        });
    };

    const generatePDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Logo header ONLY on first page
        const logoImg = await loadImage('/logo.png');
        if (logoImg) {
            doc.addImage(logoImg, 'PNG', 14, 12, 28, 8);
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Hex #64748B
        doc.text("SECURE TACTICAL CONTROL CENTER // AUDIT LOG", logoImg ? 46 : 14, 17);
        
        // Horizontal divider line
        doc.setDrawColor(27, 78, 140);
        doc.setLineWidth(0.5);
        doc.line(14, 29, doc.internal.pageSize.width - 14, 29);
        
        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(11, 19, 43);
        doc.text("DDoS ATTACK DIAGNOSTIC REPORT", 14, 40);
        
        // Threat Rating card based on volume
        const packetCount = ddosData.packetCount || 0;
        let threatScore = 1.5;
        let threatLevel = "LOW";
        let colorRGB = [16, 185, 129]; // Emerald
        let bgRGB = [236, 253, 245];
        
        if (packetCount > 5000) {
            threatScore = 9.2;
            threatLevel = "CRITICAL";
            colorRGB = [217, 64, 64]; // Red
            bgRGB = [254, 242, 242];
        } else if (packetCount > 1000) {
            threatScore = 7.1;
            threatLevel = "HIGH";
            colorRGB = [249, 115, 22]; // Orange
            bgRGB = [255, 247, 237];
        } else if (packetCount > 100) {
            threatScore = 4.5;
            threatLevel = "MEDIUM";
            colorRGB = [234, 179, 8]; // Yellow
            bgRGB = [254, 252, 232];
        }

        // Draw risk card box
        doc.setFillColor(bgRGB[0], bgRGB[1], bgRGB[2]);
        doc.setDrawColor(colorRGB[0], colorRGB[1], colorRGB[2]);
        doc.rect(14, 44, doc.internal.pageSize.width - 28, 22, 'FD');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(colorRGB[0], colorRGB[1], colorRGB[2]);
        doc.text(`${threatLevel} RISK LEVEL`, 18, 51);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        const descriptionWidth = doc.internal.pageSize.width - 28 - 32;
        doc.text("Volumetric load testing analysis logs compiled in real-time from stressor engine thread handshakes.", 18, 57, { maxWidth: descriptionWidth });
        
        // Draw solid colored badge for score
        const badgeX = doc.internal.pageSize.width - 14 - 18;
        doc.setFillColor(colorRGB[0], colorRGB[1], colorRGB[2]);
        doc.rect(badgeX, 48, 14, 14, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(threatScore.toFixed(1), badgeX + 7, 57.5, { align: "center" });
        
        // Metadata Table
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(27, 78, 140);
        doc.text("1.0 Stressor Target Metadata", 14, 76);
        
        const metaRows = [
            ["Target URL / Host", ddosData.url || "N/A"],
            ["Resolved Target IP Address", ddosData.targetIp || "Resolving..."],
            ["Attack Vector Type", ddosData.attackType || "HTTP Flood"],
            ["Configured Attack Threads", threads.toString()],
            ["Traffic Speed Profile", SPEED_LABELS[speedIndex]],
            ["Staged Target Port", port.toString()]
        ];
        
        autoTable(doc, {
            startY: 81,
            body: metaRows,
            theme: 'plain',
            styles: { fontSize: 8.5, cellPadding: 2.5 },
            columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
        });
        
        // Detailed execution trace table
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(27, 78, 140);
        const nextY = doc.lastAutoTable.finalY + 12;
        doc.text("2.0 Live execution Stress Streams", 14, nextY);
        
        const traceRows = ddosData.logs.map((log, index) => {
            return [
                index + 1,
                "STRESS_ENGINE",
                log
            ];
        });
        
        autoTable(doc, {
            startY: nextY + 5,
            head: [['Event', 'Stressor Module', 'Traffic Load Event Stream Log']],
            body: traceRows.slice(0, 50),
            theme: 'grid',
            headStyles: { fillColor: [11, 19, 43], fontSize: 8.5 },
            styles: { fontSize: 7.5, cellPadding: 3 },
            columnStyles: {
                0: { width: 15 },
                1: { fontStyle: 'bold', width: 45 }
            }
        });
        
        let currentY = doc.lastAutoTable.finalY + 14;
        
        // Page break if near bottom
        if (currentY > doc.internal.pageSize.height - 75) {
            doc.addPage();
            currentY = 25;
        }
        

        
        // Multi-page decorations: Watermark on all pages, header lines on pages > 1, and footer on all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Draw watermark in center (extremely light grey)
            doc.saveGraphicsState();
            if (doc.GState) {
                doc.setGState(new doc.GState({ opacity: 0.03 }));
                doc.setFont("helvetica", "bold");
                doc.setFontSize(45);
                doc.setTextColor(100, 116, 139);
            } else {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(45);
                doc.setTextColor(248, 250, 252);
            }
            doc.text("ROBLOCKSEC", doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2, {
                align: "center",
                angle: 35
            });
            doc.restoreGraphicsState();
            
            // Draw header lines on pages > 1
            if (i > 1) {
                doc.setDrawColor(27, 78, 140);
                doc.setLineWidth(0.5);
                doc.line(14, 12, doc.internal.pageSize.width - 14, 12);
                
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8);
                doc.setTextColor(27, 78, 140);
                doc.text("SECURITY TACTICAL CONTROL CENTER // NETWORK STRESSOR AUDIT", 14, 9);
            }
            
            // Draw bottom divider and footer on all pages
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.5);
            doc.line(14, doc.internal.pageSize.height - 15, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 15);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(150, 150, 150);
            doc.text("Confidential Security Audit - Generated by Command Center DDoS stress testing tool", 14, doc.internal.pageSize.height - 10);
            doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }
        
        const companyName = (user?.name || "audit").replace(/\s+/g, "_").toLowerCase();
        doc.save(`roblocksec_ddos_${companyName}_${ddosData.targetIp}_${port}.pdf`);
    };

    const isHTTP = ddosData?.attackType === "HTTP Flood";
    const isUDP = ddosData?.attackType === "UDP Flood";

  return (
    <div className="p-6 md:p-8 bg-[#0a0f1d] min-h-screen text-slate-200 relative">
      
      {/* 🟢 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6 mb-8 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <ServerCrash className="text-red-500" size={32} />
            Network Stressor
          </h1>
          <p className="text-slate-400 mt-1 text-xs">Volumetric and application-layer load and stress testing diagnostics.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => {
              if (!ddosData.targetIp) {
                setDdosData(prev => ({ ...prev, logs: [`[ERROR] Start a stress test first to preview a report.`, ...prev.logs] }));
                return;
              }
              setIsPreviewOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 px-4 py-2 rounded-lg text-white text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <Eye size={14} />
            Preview Report
          </button>
          <button onClick={generatePDF}
            className="flex items-center gap-2 bg-[var(--bg-elevated)] hover:bg-[var(--accent-dim)] border border-[var(--border-bright)] px-4 py-2 rounded-lg text-[var(--text-primary)] hover:text-[var(--accent-blue)] text-xs font-bold transition-all cursor-pointer">
            <Download size={14} /> Export Report
          </button>
          {ddosData?.isRunning && (
            <button onClick={handleStop}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-white text-xs font-bold transition-all cursor-pointer shadow-md">
              ⚡ STOP STRESSOR
            </button>
          )}
          <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] px-4 py-2 rounded-lg shadow-sm">
            <span className={`h-2 w-2 rounded-full ${ddosData?.isRunning ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span className="text-xs font-bold uppercase text-red-600 dark:text-red-400 tracking-wider">{ddosData?.isRunning ? "ACTIVE" : "STANDBY"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* CONFIGURATION PANEL */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-[#111827] p-6 rounded-xl border border-white/5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
              <Target className="text-red-400" size={16} />
              <h2 className="text-xs font-bold uppercase text-white tracking-wider">Target Setup</h2>
            </div>

            <div className="space-y-4">
              {/* Hostname */}
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block flex items-center gap-1"><Globe size={10}/> Target Address</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 p-2.5 bg-black/40 rounded-lg border border-white/10 text-white font-mono text-xs outline-none focus:border-red-500 transition-all"
                    placeholder="example.com"
                    value={ddosData?.url || ''}
                    onChange={(e) => setDdosData({ ...ddosData, url: e.target.value })}
                  />
                  <button onClick={handleResolve}
                    className="bg-slate-900 hover:bg-slate-800 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/10 transition-all cursor-pointer">
                    Resolve
                  </button>
                </div>
              </div>

              {ddosData?.targetIp && (
                <div className="p-3 bg-red-600/10 border border-red-600/20 rounded-lg flex justify-between items-center">
                  <span className="text-[10px] font-bold text-red-800 dark:text-red-400 uppercase tracking-wider flex items-center gap-1"><Zap size={12}/> Target IP</span>
                  <span className="font-mono text-white font-bold text-xs bg-red-600 dark:bg-red-900/30 px-2.5 py-0.5 rounded border border-red-500/20" style={{ color: '#ffffff' }}>{ddosData.targetIp}</span>
                </div>
              )}

              {/* Port */}
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">Target Port</label>
                <input
                  type="number"
                  min="1" max="65535"
                  className="w-full p-2.5 bg-black/40 rounded-lg border border-white/10 text-white font-mono text-xs outline-none focus:border-red-500 transition-all"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">Attack Vector</label>
                <CustomSelect
                  value={ddosData?.attackType || 'SYN Flood'}
                  onChange={(e) => setDdosData({ ...ddosData, attackType: e.target.value })}
                  options={[
                    { value: "SYN Flood", label: "SYN Flood" },
                    { value: "UDP Flood", label: "UDP Flood" },
                    { value: "HTTP Flood", label: "HTTP Flood" }
                  ]}
                />
              </div>

              {/* Npcap status for Volumetric Floods */}
              {ddosData?.attackType !== "HTTP Flood" && (
                <div className="flex flex-col gap-2 pt-1 select-none">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="npcap-toggle"
                      checked={npcapEnabled}
                      disabled={npcapDetected === false}
                      onChange={(e) => setNpcapEnabled(e.target.checked)}
                      className={`w-3.5 h-3.5 accent-red-600 border-white/20 rounded bg-black/40 focus:ring-0 ${npcapDetected === false ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    />
                    <label htmlFor="npcap-toggle" className={`text-[10px] font-bold uppercase tracking-wider ${npcapDetected === false ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-pointer'}`}>
                      Enable Raw Frame Stressing
                    </label>
                  </div>

                  <div className="text-[9px] font-mono font-bold flex flex-col gap-1.5 mt-1">
                    {npcapDetected === true && (
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-600/5 dark:bg-emerald-500/5 border border-emerald-600/10 dark:border-emerald-500/10 p-3 rounded-lg w-full select-none">
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Npcap Active & Loadable
                        </span>
                        <button 
                          onClick={() => { setForceNpcapCheck(true); setNpcapModalOpen(true); }}
                          className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[9px] font-bold uppercase tracking-wider rounded transition-all shadow-sm flex items-center gap-1 cursor-pointer border border-transparent"
                          style={{ color: '#ffffff' }}
                        >
                          Run Diagnostics
                        </button>
                      </div>
                    )}
                    {npcapDetected === false && (
                      <div className="flex flex-col gap-2 bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-lg w-full select-none">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Npcap Missing - Socket Fallback
                          </span>
                          <button 
                            onClick={() => { setForceNpcapCheck(true); setNpcapModalOpen(true); }}
                            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[9px] font-bold uppercase tracking-wider rounded transition-all shadow-sm flex items-center gap-1 cursor-pointer border border-transparent"
                            style={{ color: '#ffffff' }}
                          >
                            Run Diagnostics
                          </button>
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-[9px] font-normal leading-normal mt-0.5 normal-case block">
                          Install Npcap driver on the host system to enable raw frame injection.
                        </span>
                      </div>
                    )}
                    {npcapDetected === null && (
                      <span className="text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded border border-slate-500/20 animate-pulse">
                        Checking Network Driver Status...
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Duration / Limit */}
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2.5 block select-none">
                  <Timer size={10} className="inline mr-1"/> Limit (Seconds)
                </label>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setDdosData({ ...ddosData, duration: Math.max(10, (ddosData?.duration || 30) - 10) })}
                    className="w-10 h-10 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-bright)] border border-[var(--border)] rounded-lg font-bold text-lg transition-all cursor-pointer flex items-center justify-center select-none active:scale-95"
                  >
                    -
                  </button>
                  <div className="flex-1 h-10 bg-black/40 border border-white/10 rounded-lg flex items-center justify-center font-mono font-bold text-sm text-white select-none">
                    {ddosData?.duration || 30}s
                  </div>
                  <button 
                    type="button"
                    onClick={() => setDdosData({ ...ddosData, duration: Math.min(600, (ddosData?.duration || 30) + 10) })}
                    className="w-10 h-10 bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--border-bright)] border border-[var(--border)] rounded-lg font-bold text-lg transition-all cursor-pointer flex items-center justify-center select-none active:scale-95"
                  >
                    +
                  </button>
                </div>
                {/* Preset shortcuts */}
                <div className="flex gap-2 mt-2 select-none">
                  {[30, 60, 120, 300].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDdosData({ ...ddosData, duration: sec })}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all border cursor-pointer ${
                        (ddosData?.duration || 30) === sec
                          ? 'bg-red-600 text-white border-red-500 shadow-md'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-bright)]'
                      }`}
                      style={{ color: (ddosData?.duration || 30) === sec ? '#ffffff' : 'var(--text-secondary)' }}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Threads */}
              <div>
                <div className="flex justify-between items-center mb-1 select-none">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1"><Cpu size={10}/> Threads</label>
                  <span className="text-xs font-mono font-bold text-red-400">{threads}x</span>
                </div>
                <input type="range" min="1" max="50"
                  className="slider-red w-full cursor-pointer"
                  style={{ background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((threads - 1) / 49) * 100}%, var(--bg-elevated) ${((threads - 1) / 49) * 100}%, var(--bg-elevated) 100%)` }}
                  value={threads} onChange={(e) => setThreads(e.target.value)} />
                <div className="flex justify-between text-[9px] font-mono text-gray-500 dark:text-gray-400 mt-1 select-none px-1">
                  <span>1 (MIN)</span>
                  <span>10</span>
                  <span>25</span>
                  <span>50 (MAX)</span>
                </div>
              </div>

              {/* Speed */}
              <div>
                <div className="flex justify-between items-center mb-1 select-none">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1"><Radio size={10}/> Attack Speed</label>
                  <span className={`text-xs font-mono font-bold ${speedIndex === 0 ? 'text-red-400' : 'text-yellow-400'}`}>{SPEED_LABELS[speedIndex]}</span>
                </div>
                <input type="range" min="0" max="4"
                  className="slider-orange w-full cursor-pointer"
                  style={{ background: `linear-gradient(to right, #f97316 0%, #f97316 ${(speedIndex / 4) * 100}%, var(--bg-elevated) ${(speedIndex / 4) * 100}%, var(--bg-elevated) 100%)` }}
                  value={speedIndex} onChange={(e) => setSpeedIndex(parseInt(e.target.value))} />
                <div className="flex justify-between text-[9px] font-mono text-gray-500 dark:text-gray-400 mt-1 select-none px-1">
                  <span>MAX SPEED</span>
                  <span>FAST</span>
                  <span>MEDIUM</span>
                  <span>SLOW</span>
                  <span>DELAYED</span>
                </div>
              </div>

              {/* UDP Custom Payload */}
              {isUDP && (
                <div className="p-3 bg-orange-900/10 border border-orange-500/20 rounded-lg space-y-2 font-mono">
                  <label className="text-[10px] text-orange-400 font-bold uppercase tracking-wider block">UDP Payload</label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={randomPayload} onChange={(e) => setRandomPayload(e.target.checked)}
                      className="accent-red-500 font-mono" />
                    <span className="text-[11px] text-gray-400">Random junk bytes</span>
                  </label>
                  {!randomPayload && (
                    <input type="text" placeholder="Custom payload string..."
                      className="w-full p-2 bg-black/40 rounded-lg border border-white/10 text-white font-mono text-xs outline-none focus:border-orange-500 transition-all"
                      value={customPayload}
                      onChange={(e) => setCustomPayload(e.target.value)} />
                  )}
                </div>
              )}

              {/* HTTP Options */}
              {isHTTP && (
                <div className="p-3 bg-blue-900/10 border border-blue-500/20 rounded-lg space-y-2 font-mono">
                  <label className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">HTTP Options</label>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Subsite / Path</label>
                    <input type="text" placeholder="/api/login"
                      className="w-full p-2 bg-black/40 rounded-lg border border-white/10 text-white font-mono text-xs outline-none focus:border-blue-500 transition-all"
                      value={subsite}
                      onChange={(e) => setSubsite(e.target.value)} />
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={waitForReply}
                      onChange={(e) => setWaitForReply(e.target.checked)}
                      className="accent-blue-500" />
                    <span className="text-[10px] text-gray-400 font-mono">Wait for Reply</span>
                  </label>
                </div>
              )}

              {/* EXECUTE Button */}
              <button onClick={handleExecute}
                disabled={ddosData?.isRunning || !ddosData?.targetIp}
                style={{ color: ddosData?.isRunning || !ddosData?.targetIp ? 'var(--text-muted)' : '#ffffff' }}
                className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border
                  ${ddosData?.isRunning || !ddosData?.targetIp
                    ? 'bg-[var(--bg-elevated)] border-[var(--border)] cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-500 border-transparent shadow-lg shadow-red-600/25 hover:shadow-red-500/35 text-white'}`}>
                <ShieldAlert size={14} />
                {ddosData?.isRunning ? "ATTACK ACTIVE..." : "LAUNCH STRESSOR"}
              </button>
            </div>
          </div>

          {/* POST-ATTACK REPORT */}
          {attackReport && attackSession && (
            <div className="bg-[#111827] p-5 rounded-xl border border-green-500/20 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="text-green-400" size={16}/>
                <h3 className="text-xs font-bold uppercase text-green-400 tracking-wider">Session Report</h3>
              </div>
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-500">Target</span>
                  <span className="text-white font-bold">{attackSession.host}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-500">Vector</span>
                  <span className="text-red-400 font-bold">{attackSession.attackType}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-500">Threads</span>
                  <span className="text-orange-400">{attackSession.threads}x</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-white">{attackReport.elapsed}s</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500">Packets</span>
                  <span className="text-green-400 font-bold">{(attackReport.finalCount || 0).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => setAttackReport(null)}
                className="mt-3 w-full text-[10px] text-gray-500 hover:text-white uppercase tracking-wider transition-colors cursor-pointer">
                Dismiss
              </button>
            </div>
          )}
          {ddosData?.isRunning && (
            <div className="bg-red-950/20 p-5 rounded-xl border border-red-500/20 text-white relative overflow-hidden">
              <p className="text-[10px] font-bold uppercase opacity-80 tracking-wider">Live Packet Count</p>
              <h4 className="text-3xl font-bold font-mono mt-1 mb-1">{(ddosData?.packetCount || 0).toLocaleString()}</h4>
              <p className="text-[9px] opacity-50 font-mono">→ {ddosData?.targetIp}:{port}</p>
            </div>
          )}
        </div>

        {/* FORENSIC STREAM */}
        <div className="xl:col-span-8 flex flex-col">
          <div className="bg-[#030712] p-5 rounded-xl border border-white/5 flex-1 min-h-[480px] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider font-mono ml-2 flex items-center gap-1.5">
                  <TerminalSquare size={14} className="text-red-500"/> Outbound Stream logs
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setDdosData({ ...ddosData, logs: [] })}
                  className="text-[9px] font-bold text-slate-500 hover:text-white uppercase tracking-wider transition-colors cursor-pointer">
                  Clear Logs
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs pr-2">
              {(!ddosData?.logs || ddosData.logs.length === 0) && (
                <div className="text-gray-600 italic">// Awaiting stressor launch sequence...</div>
              )}
              {(ddosData?.logs || []).map((log, i) => {
                let color = "text-slate-400";
                let bg = "";
                if (log.includes('[CRITICAL]') || log.includes('[ERROR]')) {
                  color = "text-red-400 font-bold";
                  bg = "bg-red-500/10 border-l-2 border-red-500 pl-3 py-0.5";
                } else if (log.includes('[WARN]')) {
                  color = "text-yellow-400";
                  bg = "border-l border-yellow-500/40 pl-2";
                } else if (log.includes('[TRAFFIC]')) {
                  color = "text-orange-400";
                  bg = "border-l border-orange-500/30 pl-2";
                } else if (log.includes('[SYSTEM]')) {
                  color = "text-blue-400 font-bold";
                  bg = "border-l border-blue-500/30 pl-2";
                }
                return (
                  <div key={i} className={`flex gap-3 items-start leading-relaxed ${color} ${bg}`}>
                    <span className="opacity-30 text-[10px] w-14 select-none shrink-0">
                      [{new Date().toLocaleTimeString([], { hour12: false })}]
                    </span>
                    <span className="flex-1 break-all">{log}</span>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </div>

      <NpcapCheckModal 
        isOpen={npcapModalOpen} 
        onClose={() => {
          setNpcapModalOpen(false);
          setForceNpcapCheck(false);
        }} 
        onDetected={handleNpcapDetected}
        forceCheck={forceNpcapCheck}
      />

      <ReportPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        type="ddos"
        data={{
          url: ddosData.url,
          targetIp: ddosData.targetIp,
          attackType: ddosData.attackType,
          threads: threads,
          packetCount: ddosData.packetCount,
          logs: ddosData.logs,
          elapsed: attackReport ? attackReport.elapsed : (ddosData.packetCount > 0 ? 5 : 0) // fallback if active session
        }}
        onDownload={generatePDF}
      />

    </div>
  );
};

export default Ddos;