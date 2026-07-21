import React, { useEffect, useState, useContext } from 'react';
import API from '../services/api';
import { useSecurity } from '../context/SecurityContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Crosshair, ShieldAlert, TerminalSquare, Activity, Network, Upload, Fingerprint, Lock, ShieldCheck, X, Eye, Download, Server, Shield, Terminal } from "lucide-react";
import NpcapCheckModal from '../components/NpcapCheckModal';
import CustomSelect from '../components/CustomSelect';
import ReportPreviewModal from '../components/ReportPreviewModal';
import { AuthContext } from '../context/AuthContext';

const Scanner = () => {
    const { user } = useContext(AuthContext);
    // Access Global Security State for cross-tab persistence
    const { scannerData, setScannerData } = useSecurity();
    const updateScanner = (fields) => setScannerData(prev => ({ ...prev, ...fields }));

    const [wordlistConfig, setWordlistConfig] = useState({ useCustom: false, file: null, passwords: [] });
    const [uploadError, setUploadError] = useState("");
    const [selectedPort, setSelectedPort] = useState(null);
    const [npcapEnabled, setNpcapEnabled] = useState(true);
    const [npcapDetected, setNpcapDetected] = useState(null);
    const [npcapModalOpen, setNpcapModalOpen] = useState(false);
    const [forceNpcapCheck, setForceNpcapCheck] = useState(false);
    const [notification, setNotification] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInterfaces = async () => {
            try {
                const res = await API.get('/scanner/interfaces');
                updateScanner({ interfaces: res.data });
                if (res.data?.length > 0 && !scannerData.selectedIface) {
                    const firstIface = res.data[0];
                    let defaultRange = "";
                    if (firstIface.ip) {
                        const parts = firstIface.ip.split(".");
                        if (parts.length === 4) defaultRange = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
                    }
                    updateScanner({ selectedIface: firstIface.name, targetRange: scannerData.targetRange || defaultRange });
                }
            } catch (err) { console.error("Interface hardware error:", err); }
        };

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

        if (scannerData.interfaces.length === 0) fetchInterfaces();
        checkNpcap();
    }, [scannerData.interfaces]);

    useEffect(() => {
        const latestLog = scannerData.attackLogs[0];
        if (latestLog && latestLog.includes("[!] SUCCESS:")) {
            setNotification({
                type: "success",
                title: "Breach Successful",
                message: latestLog.replace("[!] ", "")
            });
        }
    }, [scannerData.attackLogs[0]]);

    const handleNpcapDetected = (detected) => {
        setNpcapDetected(detected);
        setNpcapEnabled(detected);
    };

    const handleStartScan = async () => {
        updateScanner({ loading: true, liveHosts: [], lockedTarget: null, auditData: null, attackLogs: ["Initializing Reconnaissance..."] });
        try {
            const res = await API.get(`/scanner/run-scan`, { params: { interface: scannerData.selectedIface, target: scannerData.targetRange, use_npcap: npcapEnabled } });
            updateScanner({ liveHosts: res.data.hosts || [] });
        } catch (err) { updateScanner({ attackLogs: ["❌ Error: Discovery failed.", ...scannerData.attackLogs] }); }
        finally { updateScanner({ loading: false }); }
    };

    const handleAudit = async () => {
        if (!scannerData.lockedTarget) return;
        updateScanner({ isAuditing: true, auditData: null, attackLogs: [`Auditing Target: ${scannerData.lockedTarget}`, ...scannerData.attackLogs] });
        try {
            const res = await API.get(`/scanner/audit-target`, { params: { ip: scannerData.lockedTarget, use_npcap: npcapEnabled } });
            updateScanner({ auditData: res.data });
        } catch (err) { updateScanner({ attackLogs: ["❌ Error: Audit failed. Connection blocked.", ...scannerData.attackLogs] }); }
        finally { updateScanner({ isAuditing: false }); }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        setUploadError("");
        
        if (!file) return;

        if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
            setUploadError("❌ Invalid file type. Only .txt files are supported.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
            
            if (lines.length === 0) {
                setUploadError("❌ The uploaded wordlist is empty.");
            } else {
                setWordlistConfig({ ...wordlistConfig, file: file, passwords: lines });
            }
        };
        reader.onerror = () => setUploadError("❌ Failed to read the file.");
        reader.readAsText(file);
    };

    const executeAttack = async () => {
        setUploadError("");

        if (wordlistConfig.useCustom && wordlistConfig.passwords.length === 0) {
            setUploadError("❌ You must upload a valid custom wordlist (.txt) to proceed.");
            return;
        }

        updateScanner({ isAttacking: true, attackLogs: ["Deploying Attack Kernel..."] });
        try {
            await API.post('/bruteforce/start-ssh-burst', {
                ip: scannerData.lockedTarget,
                port: selectedPort,
                use_custom: wordlistConfig.useCustom,
                custom_passwords: wordlistConfig.passwords
            });
        } catch (err) { 
            updateScanner({ isAttacking: false, attackLogs: ["❌ Engine Error: Initialization failed.", ...scannerData.attackLogs] }); 
        }
    };

    const stopAttack = async () => {
        try {
            await API.post('/bruteforce/stop-ssh-burst', { ip: scannerData.lockedTarget });
            updateScanner({ 
                isAttacking: false, 
                attackLogs: ["⚠️ ATTACK ABORTED: SSH burst session stopped by operator.", ...scannerData.attackLogs] 
            });
            setNotification({
                type: "warning",
                title: "Attack Aborted",
                message: "The SSH brute force simulation was stopped successfully."
            });
        } catch (err) {
            console.error("Stop attack error:", err);
            updateScanner({ 
                isAttacking: false, 
                attackLogs: ["⚠️ ATTACK ABORTED (local): SSH burst session stopped by operator.", ...scannerData.attackLogs] 
            });
        }
    };

    const firewalledHosts = scannerData.attackLogs
        .filter(log => log.includes("actively blocking"))
        .map(log => log.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)?.[0])
        .filter((val, id, self) => val && self.indexOf(val) === id);

    const latestProgress = scannerData.attackLogs.find(l => l.includes('%'))?.match(/\d+/)?.[0] || 0;

    const handleIfaceChange = (e) => {
        const ifaceName = e.target.value;
        const selectedObj = scannerData.interfaces.find(i => i.name === ifaceName);
        
        let newTargetRange = scannerData.targetRange;
        if (selectedObj && selectedObj.ip) {
            const parts = selectedObj.ip.split(".");
            if (parts.length === 4) newTargetRange = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
        }
        
        updateScanner({
            selectedIface: ifaceName,
            targetRange: newTargetRange
        });
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
        try {
            if (scannerData.liveHosts.length === 0 && scannerData.attackLogs.length === 0) {
                setNotification({
                    type: "error",
                    title: "Data Required",
                    message: "Perform a subnet scan or dictionary attack first to generate a report."
                });
                return;
            }

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
            doc.text("SUBNET DISCOVERY & ATTACK REPORT", 14, 40);

            // Calculate threat score
            const hasSuccess = scannerData.attackLogs.some(log => log.includes("[SUCCESS]") || log.toLowerCase().includes("cracked") || log.toLowerCase().includes("matched") || log.toLowerCase().includes("success"));
            let threatScore = 1.0;
            let threatLevel = "LOW";
            let colorRGB = [16, 185, 129]; // Emerald
            let bgRGB = [236, 253, 245];
            
            if (hasSuccess) {
                threatScore = 9.6;
                threatLevel = "CRITICAL";
                colorRGB = [217, 64, 64]; // Red
                bgRGB = [254, 242, 242];
            } else if (scannerData.liveHosts.length > 0) {
                threatScore = 5.2;
                threatLevel = "MEDIUM";
                colorRGB = [234, 179, 8]; // Yellow
                bgRGB = [254, 252, 232];
            }

            // Draw threat card box
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
            doc.text("Active subnet surveillance scanning and credential dictionary attack execution records.", 18, 57, { maxWidth: descriptionWidth });
            
            // Draw solid colored badge for score
            const badgeX = doc.internal.pageSize.width - 14 - 18;
            doc.setFillColor(colorRGB[0], colorRGB[1], colorRGB[2]);
            doc.rect(badgeX, 48, 14, 14, 'F');
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            doc.text(threatScore.toFixed(1), badgeX + 7, 57.5, { align: "center" });

            // Audit details metadata table
            const metaRows = [
                ["Target Range", scannerData.targetRange || "N/A"],
                ["Discovery Interface", scannerData.selectedIface || "N/A"],
                ["Live Hosts Found", `${scannerData.liveHosts.length} hosts`],
                ["Target Locked", scannerData.lockedTarget || "None Locked"],
                ["Attack Logs Count", `${scannerData.attackLogs.length} logs`],
                ["Security Scan Mode", "Npcap Active Scan / Socket Check"],
                ["Report Timestamp", new Date().toLocaleString()]
            ];

            autoTable(doc, {
                startY: 72,
                head: [['Audit Scope Parameters', 'Configuration Value']],
                body: metaRows,
                theme: 'striped',
                headStyles: { fillColor: [27, 78, 140], fontSize: 8.5 },
                styles: { fontSize: 8, cellPadding: 3.5 },
                columnStyles: {
                    0: { fontStyle: 'bold', width: 60 }
                }
            });

            // Target hosts tables
            const targetRows = scannerData.liveHosts.map(h => [h.ip, 'ACTIVE / RESPONDING', 'Subnet Host Discovery']);
            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 14,
                head: [['Discovery Target Host', 'Discovery Status', 'Notes']],
                body: targetRows.length === 0 ? [['N/A', 'No active hosts discovered', '']] : targetRows,
                theme: 'grid',
                headStyles: { fillColor: [11, 19, 43], fontSize: 8.5 },
                styles: { fontSize: 8, cellPadding: 3.5 }
            });

            // Attack logs tables
            const logsRows = scannerData.attackLogs.map(l => [l]);
            if (logsRows.length > 0) {
                autoTable(doc, {
                    startY: doc.lastAutoTable.finalY + 14,
                    head: [['Dictionary Attack Execution Stream Log']],
                    body: logsRows.slice(0, 100),
                    theme: 'grid',
                    headStyles: { fillColor: [11, 19, 43], fontSize: 8.5 },
                    styles: { fontSize: 7, cellPadding: 2.5 }
                });
            }

            // Multi-page decorations
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                // Watermark
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
                
                // Header on page > 1
                if (i > 1) {
                    doc.setDrawColor(27, 78, 140);
                    doc.setLineWidth(0.5);
                    doc.line(14, 12, doc.internal.pageSize.width - 14, 12);
                    
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8);
                    doc.setTextColor(27, 78, 140);
                    doc.text("SECURITY TACTICAL CONTROL CENTER // RECON & BRUTEFORCE AUDIT", 14, 9);
                }
                
                // Footer
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.5);
                doc.line(14, doc.internal.pageSize.height - 15, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 15);
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);
                doc.setTextColor(150, 150, 150);
                doc.text("Confidential Security Audit - Generated by Command Center Recon & Bruteforce engine", 14, doc.internal.pageSize.height - 10);
                doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
            }

            const companyName = (user?.name || "audit").replace(/\s+/g, "_").toLowerCase();
            const subnetClean = (scannerData.targetRange || "192.168.29.0").replace(/[\/\.]/g, "_");
            doc.save(`roblocksec_bruteforce_${companyName}_subnet_${subnetClean}.pdf`);

        } catch (err) {
            console.error("PDF generation failed:", err);
            setNotification({
                type: "error",
                title: "Generation Failed",
                message: `Failed to compile PDF report: ${err.message}`
            });
        }
    };

  return (
    <div className="p-6 md:p-8 bg-[#0a1128] min-h-screen text-slate-200 relative">
      
      {/* 🟢 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6 mb-8 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <Fingerprint className="text-cyan-500" size={32} />
            Bruteforce & Recon
          </h1>
          <p className="text-slate-400 mt-1 text-xs">Subnet sweep discovery and target dictionary attacks.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => {
              if (scannerData.liveHosts.length === 0 && scannerData.attackLogs.length === 0) {
                setNotification({
                  type: "error",
                  title: "Data Required",
                  message: "Perform a subnet scan or dictionary attack first to preview a report."
                });
                return;
              }
              setIsPreviewOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 px-4 py-2 rounded-lg text-white text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <Eye size={14} />
            Preview Report
          </button>
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 bg-[var(--bg-elevated)] hover:bg-[var(--accent-dim)] border border-[var(--border-bright)] px-4 py-2 rounded-lg text-[var(--text-primary)] hover:text-[var(--accent-blue)] text-xs font-bold transition-all cursor-pointer"
          >
            <Download size={14} />
            Export Intel Report
          </button>
          {scannerData.isAttacking && (
            <button 
              onClick={stopAttack}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-white text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              ✕ Stop Attack
            </button>
          )}
          <div className="flex items-center gap-2 bg-slate-900 border border-white/5 px-4 py-2 rounded-lg">
            <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]"></span>
            <span className="text-xs font-bold uppercase text-cyan-400 tracking-wider">Discovery Kernel Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* 🟢 LEFT COLUMN: Recon & Config */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* Discovery Module */}
          <div className="bg-[#111827] p-6 rounded-xl border border-white/5 relative overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
              <Network className="text-cyan-400" size={16} />
              <h2 className="text-xs font-bold uppercase text-white tracking-wider">Discovery Configuration</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">Network Interface</label>
                <CustomSelect 
                  value={scannerData.selectedIface} 
                  onChange={handleIfaceChange}
                  options={scannerData.interfaces.map(iface => ({
                    value: iface.name,
                    label: `${iface.name} (${iface.ip})`
                  }))}
                />
              </div>
              
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">Target Subnet (CIDR)</label>
                <input 
                  className="w-full p-3 bg-black/40 rounded-lg border border-white/10 text-cyan-400 font-mono text-xs outline-none focus:border-cyan-500 focus:bg-white/5 transition-all placeholder:text-gray-700" 
                  placeholder="e.g. 192.168.1.0/24"
                  value={scannerData.targetRange} 
                  onChange={(e) => updateScanner({targetRange: e.target.value})} 
                />
              </div>

              <div className="flex flex-col gap-2 pt-1 select-none">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="npcap-toggle"
                    checked={npcapEnabled}
                    disabled={npcapDetected === false}
                    onChange={(e) => setNpcapEnabled(e.target.checked)}
                    className={`w-3.5 h-3.5 accent-[#d4af37] border-white/20 rounded bg-black/40 focus:ring-0 ${npcapDetected === false ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  />
                  <label htmlFor="npcap-toggle" className={`text-[10px] font-bold uppercase tracking-wider ${npcapDetected === false ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-pointer'}`}>
                    Enable Npcap Sweep
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
                        Install Npcap driver on the host system to enable raw SYN scanning packets.
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

              <div className="flex gap-4">
                <button 
                  onClick={handleStartScan}
                  disabled={scannerData.loading}
                  style={{ color: scannerData.loading ? 'var(--text-muted)' : '#ffffff' }}
                  className={`flex-1 py-2.5 rounded font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${scannerData.loading ? 'bg-[var(--bg-elevated)] border border-[var(--border)] cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md hover:shadow-lg'}`}
                >
                  {scannerData.loading ? "SCANNING SUBNET..." : "RUN IP SCAN"}
                </button>
              </div>
            </div>
          </div>

          {/* Active Nodes Matrix */}
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] overflow-hidden h-[240px] flex flex-col shadow-sm">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] flex justify-between items-center select-none">
              <h2 className="text-[10px] font-bold uppercase text-[var(--text-primary)] tracking-wider flex items-center gap-2">
                <Activity size={12}/> Active Host Discovery
              </h2>
              <span className="text-[9px] font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{scannerData.liveHosts.length} Hosts</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 pr-2">
              {scannerData.liveHosts.length === 0 && <p className="text-[10px] text-gray-600 italic text-center mt-8">// Awaiting scanner execution...</p>}
              {scannerData.liveHosts.map((host, i) => (
                <div key={i} className={`flex justify-between items-center p-2.5 rounded-lg border transition-all cursor-pointer group ${scannerData.lockedTarget === host.ip ? 'bg-[var(--accent-dim)] border-[var(--accent-blue)]/50' : 'bg-[var(--bg-elevated)] border-[var(--border)] hover:border-[var(--border-bright)]'}`} onClick={() => updateScanner({ lockedTarget: host.ip })}>
                  <div className="flex items-center gap-2.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${scannerData.lockedTarget === host.ip ? 'bg-cyan-500' : 'bg-gray-400'}`}></span>
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">{host.ip}</span>
                  </div>
                  <span 
                    style={{ color: scannerData.lockedTarget === host.ip ? '#ffffff' : 'var(--text-muted)' }}
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-all ${scannerData.lockedTarget === host.ip ? 'bg-cyan-600 text-white' : 'text-[var(--text-muted)] bg-[var(--bg-elevated)] opacity-0 group-hover:opacity-100'}`}
                  >
                    {scannerData.lockedTarget === host.ip ? "Target Locked" : "Select"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* IDS Detection */}
          {firewalledHosts.length > 0 && (
            <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20">
              <h2 className="text-[10px] font-bold uppercase text-red-500 tracking-wider mb-3 flex items-center gap-1.5">
                <ShieldAlert size={14} /> Firewall Drop Detection
              </h2>
              <div className="space-y-1.5">
                {firewalledHosts.map(ip => (
                  <div key={ip} className="flex items-center justify-between text-red-800 dark:text-red-400 font-bold font-mono text-xs bg-red-600/10 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-600/20 dark:border-red-500/20">
                    <div className="flex items-center gap-1.5 select-none">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-500 animate-pulse"></span>
                      {ip} 
                    </div>
                    <span className="text-red-700 dark:text-red-300 text-[10px] font-black uppercase tracking-wider select-none">FILTERED</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 🟢 RIGHT COLUMN: Terminal & Matrix */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* Live Terminal Stream */}
          <div className="bg-[#030712] p-5 rounded-xl border border-white/5 h-[340px] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                </div>
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider font-mono ml-2">Console Output</span>
              </div>
              
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:block w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${latestProgress}%` }}></div>
                </div>
                <span className="text-[9px] text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{latestProgress}%</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs scrollbar-thin scrollbar-thumb-white/10 pr-2">
              {scannerData.attackLogs.map((log, i) => {
                let logColor = "text-slate-400";
                let bgStyle = "";
                if (log.includes('⚠️')) { logColor = "text-yellow-400"; bgStyle = "bg-yellow-500/5 border-l border-yellow-500 pl-2 py-0.5"; }
                else if (log.includes('root@kali')) { logColor = "text-emerald-400"; }
                else if (log.includes('[!] SUCCESS')) { logColor = "text-cyan-400 font-bold"; bgStyle = "bg-cyan-500/10 border-l border-cyan-400 pl-2 py-0.5"; }
                else if (log.includes('[PACKET]')) { logColor = "text-slate-500"; }
                else if (log.includes('❌')) { logColor = "text-red-400"; bgStyle = "bg-red-500/5 border-l border-red-500 pl-2 py-0.5"; }

                return (
                  <div key={i} className={`flex gap-2 items-start leading-relaxed ${logColor} ${bgStyle}`}>
                    <span className="opacity-95">{log}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Exploitation Control Matrix */}
          <div className="bg-[#111827] p-6 rounded-xl border border-white/5 flex-1 relative overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
              <Crosshair className="text-red-400" size={16} />
              <h2 className="text-xs font-bold uppercase text-white tracking-wider">Target Exploit matrix</h2>
            </div>
            
            {scannerData.auditData && !selectedPort && (
              <div className="animate-in fade-in">
                {scannerData.auditData.services.length === 0 ? (
                  <div className="w-full text-center py-8 bg-black/20 border border-white/5 rounded-lg">
                    <ShieldCheck className="mx-auto text-emerald-500 mb-2" size={24} />
                    <p className="text-xs font-mono text-gray-500">No open ports mapped on {scannerData.lockedTarget}.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {scannerData.auditData.services.map((s, i) => {
                      const isTargeted = scannerData.auditData.bruteforce_ports.includes(s.port);
                      return (
                        <div 
                          key={i} 
                          className={`p-4 rounded-xl border flex flex-col items-center gap-2 relative overflow-hidden transition-all shadow-xs ${
                            isTargeted
                              ? 'bg-red-500/5 dark:bg-red-950/10 border-red-300 dark:border-red-900/50 hover:border-red-400 dark:hover:border-red-800'
                              : 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-800'
                          }`}
                        >
                          <span className={`font-mono text-xl font-bold ${
                            isTargeted ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>{s.port}</span>
                          <span className="text-[9px] text-[var(--text-secondary)] font-bold tracking-wider uppercase">{s.name || "UNKNOWN"}</span>
                          
                          {isTargeted ? (
                            <button 
                              onClick={() => setSelectedPort(s.port)} 
                              style={{ color: '#ffffff' }}
                              className="w-full bg-red-600 hover:bg-red-550 border border-transparent text-[9px] py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all mt-1.5 cursor-pointer shadow-sm text-white"
                            >
                              Target Port
                            </button>
                          ) : (
                            <div 
                              className="w-full text-center text-[9px] py-1.5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold uppercase tracking-wider mt-1.5 bg-emerald-500/10 shadow-xs"
                            >
                              Secure
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {selectedPort && (
              <div className="bg-[var(--bg-elevated)] p-6 rounded-lg border border-red-500/30 shadow-inner">
                <div className="flex justify-between items-center border-b border-[var(--border)] pb-3 mb-4 select-none">
                  <h3 className="text-xs font-bold uppercase text-red-550 flex items-center gap-2 tracking-wider">
                    <Lock size={14} />
                    Configuration: Port {selectedPort}
                  </h3>
                  <button 
                    onClick={() => { setSelectedPort(null); setUploadError(""); }} 
                    className="text-[var(--text-secondary)] hover:text-white hover:bg-red-600 hover:border-red-600 p-1.5 rounded-full transition-all cursor-pointer border border-[var(--border)] flex items-center justify-center shadow-xs hover:shadow-md hover:shadow-red-600/10 hover:scale-105 active:scale-95 group"
                    title="Close Configuration"
                  >
                    <X size={10} className="group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                </div>
                
                <div className="flex gap-4 mb-4 select-none">
                  <button onClick={() => { setWordlistConfig({...wordlistConfig, useCustom: false}); setUploadError(""); }} 
                      style={{ color: !wordlistConfig.useCustom ? '#ffffff' : 'var(--text-muted)' }}
                      className={`flex-1 py-3 rounded text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${!wordlistConfig.useCustom ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-bright)]'}`}>
                    Default Wordlist
                  </button>
                  <button onClick={() => { setWordlistConfig({...wordlistConfig, useCustom: true}); setUploadError(""); }} 
                      style={{ color: wordlistConfig.useCustom ? '#ffffff' : 'var(--text-muted)' }}
                      className={`flex-1 py-3 rounded text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${wordlistConfig.useCustom ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-bright)]'}`}>
                    Custom Wordlist
                  </button>
                </div>

                {wordlistConfig.useCustom && (
                  <div className="flex flex-col gap-2 mb-4">
                    <input 
                      type="file" 
                      accept=".txt" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      id="file-upload" 
                    />
                    <label htmlFor="file-upload" className="w-full p-6 border-2 border-dashed border-cyan-600/30 dark:border-cyan-500/30 bg-cyan-600/5 dark:bg-cyan-500/5 hover:bg-cyan-600/10 dark:hover:bg-cyan-500/10 hover:border-cyan-600/50 dark:hover:border-cyan-500/50 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group shadow-inner select-none">
                      <div className="p-2 bg-cyan-600/10 dark:bg-cyan-500/10 rounded-lg group-hover:scale-110 group-hover:bg-cyan-600/20 dark:group-hover:bg-cyan-500/20 transition-all">
                        <Upload size={18} className="text-cyan-700 dark:text-cyan-400"/>
                      </div>
                      <div className="text-center">
                        <span className="block text-xs font-black uppercase text-cyan-800 dark:text-cyan-300 tracking-wider">
                          {wordlistConfig.file ? `Loaded: ${wordlistConfig.file.name}` : "Select wordlist file"}
                        </span>
                        <span className="block text-[9px] font-bold text-cyan-700/60 dark:text-cyan-400/50 uppercase tracking-widest mt-1">
                          {wordlistConfig.file ? `${wordlistConfig.passwords.length} payloads loaded` : "Plain text dictionary (.txt)"}
                        </span>
                      </div>
                    </label>
                    {uploadError && <p className="text-red-500 text-[9px] font-bold tracking-wider uppercase">{uploadError}</p>}
                  </div>
                )}

                {scannerData.isAttacking ? (
                  <button onClick={stopAttack} 
                    style={{ color: '#ffffff' }}
                    className="w-full bg-red-600 hover:bg-red-550 border border-transparent py-3 rounded-lg font-bold uppercase tracking-wider text-xs text-white transition-all flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
                  >
                    ✕ Stop Attack
                  </button>
                ) : (
                  <button onClick={executeAttack} 
                    style={{ color: '#ffffff' }}
                    className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition-all cursor-pointer shadow-lg shadow-red-600/20 hover:shadow-red-500/30 border border-transparent">
                    Launch {scannerData.auditData?.services.find(s => s.port === selectedPort)?.name?.toUpperCase() || "PORT"} Attack
                  </button>
                )}
              </div>
            )}
            
            {!selectedPort && (
              <button 
                disabled={!scannerData.lockedTarget || scannerData.isAuditing} 
                onClick={handleAudit} 
                style={{ color: !scannerData.lockedTarget || scannerData.isAuditing ? 'var(--text-muted)' : '#ffffff' }}
                className={`w-full mt-4 py-3 rounded-lg font-bold uppercase text-xs tracking-wider transition-all cursor-pointer border
                  ${!scannerData.lockedTarget || scannerData.isAuditing
                    ? 'bg-[var(--bg-elevated)] border-[var(--border)] cursor-not-allowed'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white border-transparent shadow-lg shadow-cyan-600/20 hover:shadow-cyan-500/30'}`}
              >
                {scannerData.isAuditing ? "Identifying services..." : "Audit Locked Target"}
              </button>
            )}
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

      {notification && (
        <div className="fixed bottom-6 left-6 z-[60] w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-5 shadow-2xl font-mono text-xs">
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

      <ReportPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        type="bruteforce"
        data={{
          targetRange: scannerData.targetRange,
          selectedIface: scannerData.selectedIface,
          liveHosts: scannerData.liveHosts,
          attackLogs: scannerData.attackLogs,
          lockedTarget: scannerData.lockedTarget
        }}
        onDownload={generatePDF}
      />
    </div>
  );
};

export default Scanner;