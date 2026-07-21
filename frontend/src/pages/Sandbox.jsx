import React, { useEffect, useRef, useState, useContext } from 'react';
import API from '../services/api';
import { useSecurity } from '../context/SecurityContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bug, Cpu, FileSearch, Activity, Download, TerminalSquare, ShieldAlert, FileWarning, Upload, Clock, Globe, Shield, Tag, Eye } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import ReportPreviewModal from '../components/ReportPreviewModal';
import { AuthContext } from '../context/AuthContext';

const Sandbox = () => {
    const { user } = useContext(AuthContext);
    const { sandboxData, setSandboxData } = useSecurity();
    const [error, setError] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const socketRef = useRef(null);

    // Advanced Configuration State
    const [analysisTime, setAnalysisTime] = useState(120);
    const [networkMode, setNetworkMode] = useState("HTTPS");
    const [codeAnalysis, setCodeAnalysis] = useState({
        AMSI: false,
        "Powershell Logging": false,
        HCA: false,
        VBA: false
    });
    const [intelligence, setIntelligence] = useState(true);
    const [tags, setTags] = useState("");

    const toggleCodeAnalysis = (key) => {
        setCodeAnalysis(prev => ({ ...prev, [key]: !prev[key] }));
    };



    const handleStart = async () => {
        if (!sandboxData.selectedFile) {
            setError("Select a malware sample first.");
            return;
        }
        setError(null);
        setSandboxData(prev => ({ ...prev, isRunning: true, logs: ["[SYSTEM] Establishing API handshakes..."] }));
        
        const formData = new FormData();
        formData.append("file", sandboxData.selectedFile);
        formData.append("os_env", sandboxData.selectedOS || "w10x64_office");
        formData.append("analysis_time", analysisTime);
        formData.append("network_mode", networkMode);
        
        const caFlags = Object.keys(codeAnalysis).filter(k => codeAnalysis[k]).join(",");
        formData.append("code_analysis", caFlags);
        formData.append("intelligence", intelligence ? "URL Reputation" : "");
        formData.append("tags", tags);

        try {
            await API.post('/sandbox/analyze', formData);
        } catch (err) {
            setError("Analysis failed. Check backend/API keys.");
            setSandboxData(prev => ({ ...prev, isRunning: false }));
        }
    };

    const handleStop = async () => {
        try {
            await API.post('/sandbox/stop', { filename: sandboxData.selectedFile?.name });
        } catch (err) {
            console.error("Failed to stop sandbox on backend:", err);
        }
        setSandboxData(prev => ({
            ...prev,
            isRunning: false,
            logs: [`[SYSTEM] Analysis aborted by operator. Sandbox session terminated.`, ...prev.logs]
        }));
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
        if (!sandboxData.selectedFile) {
            setError("Run an analysis first to generate a report.");
            return;
        }
        const doc = new jsPDF();
        
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
        doc.text("BEHAVIORAL THREAT ANALYSIS REPORT", 14, 40);
        
        // Risk assessment card
        const fileLogs = sandboxData.logs || [];
        const logStr = fileLogs.join("\n").toLowerCase();
        const hasCritical = logStr.includes("inject") || logStr.includes("bypass") || logStr.includes("exploit") || logStr.includes("malicious");
        const hasHigh = logStr.includes("registry") || logStr.includes("network") || logStr.includes("create") || logStr.includes("write");
        
        let threatScore = 1.2;
        let threatLevel = "LOW";
        let colorRGB = [16, 185, 129]; // Emerald
        let bgRGB = [236, 253, 245];
        
        if (hasCritical) {
            threatScore = 9.4;
            threatLevel = "CRITICAL";
            colorRGB = [217, 64, 64]; // Red
            bgRGB = [254, 242, 242];
        } else if (hasHigh) {
            threatScore = 7.2;
            threatLevel = "HIGH";
            colorRGB = [249, 115, 22]; // Orange
            bgRGB = [255, 247, 237];
        } else if (fileLogs.length > 0) {
            threatScore = 4.8;
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
        doc.text("Interactive malware behavioral execution diagnostic. Threat vectors exfiltrated from the isolated guest OS.", 18, 57, { maxWidth: descriptionWidth });
        
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
        doc.text("1.0 Analysis Overview", 14, 76);
        
        const metaRows = [
            ["Target Executable File", sandboxData.selectedFile?.name || "SuspiciousPayload.exe"],
            ["Sandbox Environment Profile", sandboxData.selectedOS || "w10x64_office"],
            ["Total Sandbox Log Actions", fileLogs.length.toString()],
            ["Simulated Checksum (MD5)", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"]
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
        doc.text("2.0 Behavioral Activity Records", 14, nextY);
        
        const traceRows = fileLogs.map((log, index) => {
            const parts = log.split(" → ");
            return [
                index + 1,
                parts[0] || "SYSTEM",
                parts[1] || log
            ];
        });
        
        autoTable(doc, {
            startY: nextY + 5,
            head: [['Step', 'Execution Module', 'Behavioral Activity Details']],
            body: traceRows.slice(0, 80),
            theme: 'grid',
            headStyles: { fillColor: [11, 19, 43], fontSize: 8.5 },
            styles: { fontSize: 7.5, cellPadding: 3 },
            columnStyles: {
                0: { width: 12 },
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
                doc.text("SECURITY TACTICAL CONTROL CENTER // MALWARE SANDBOX AUDIT", 14, 9);
            }
            
            // Draw bottom divider and footer on all pages
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.5);
            doc.line(14, doc.internal.pageSize.height - 15, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 15);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(150, 150, 150);
            doc.text("Confidential Security Audit - Generated by Command Center Sandbox Environment", 14, doc.internal.pageSize.height - 10);
            doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }
        
        const companyName = (user?.name || "audit").replace(/\s+/g, "_").toLowerCase();
        let fileName = sandboxData.selectedFile?.name || "SuspiciousPayload.exe";
        if (fileName.toLowerCase().endsWith(".pdf")) {
            fileName = fileName.substring(0, fileName.length - 4);
        }
        fileName = fileName.replace(/\s+/g, "_");
        doc.save(`roblocksec_sandbox_${companyName}_${fileName}.pdf`);
    };

  return (
    <div className="p-6 md:p-8 bg-[#0a1128] min-h-screen text-slate-200 relative">
      
      {/* 🟢 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6 mb-8 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <Bug className="text-emerald-500" size={32} />
            Malware Sandbox
          </h1>
          <p className="text-slate-400 mt-1 text-xs">Isolated static checking and payload structure audit.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => {
              if (!sandboxData.selectedFile) {
                setError("Run an analysis first to preview a report.");
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
          {sandboxData.isRunning && (
            <button 
              onClick={handleStop}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg text-white text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              ✕ Stop Analysis
            </button>
          )}
          <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] px-4 py-2 rounded-lg shadow-sm">
            <span className={`h-2 w-2 rounded-full ${sandboxData.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
            <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">{sandboxData.isRunning ? "Sandbox Running" : "Sandbox Idle"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* 🟢 CONFIGURATION PANEL */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border)] border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-3 border-b border-[var(--border)] pb-3 mb-4">
              <Cpu className="text-emerald-505" size={16} />
              <h2 className="text-xs font-bold uppercase text-[var(--text-primary)] tracking-wider">Environment Setup</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                  <FileSearch size={12} className="text-purple-500"/> Payload Selection
                </label>
                <div className="border border-dashed border-emerald-500/30 rounded-lg p-4 text-center bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer transition-all flex flex-col items-center gap-2">
                  <input type="file" className="hidden" id="fileIn" onChange={(e) => setSandboxData(prev => ({ ...prev, selectedFile: e.target.files[0] }))} />
                  <label htmlFor="fileIn" className="cursor-pointer text-xs font-bold text-emerald-550 uppercase tracking-wider flex flex-col items-center gap-1.5 w-full h-full">
                    {sandboxData.selectedFile ? (
                      <>
                        <FileWarning size={18} className="text-red-500 mb-0.5"/>
                        <span className="text-[var(--text-primary)] text-[11px] truncate max-w-[200px]">{sandboxData.selectedFile.name}</span>
                        <span className="text-[9px] text-emerald-500/70">Payload Staged</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="mb-0.5 text-emerald-500/70"/>
                        <span>Upload Binary</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1.5 block">Target Environment OS</label>
                <CustomSelect 
                  value={sandboxData.selectedOS || "w10x64_office"} 
                  onChange={(e) => setSandboxData(prev => ({ ...prev, selectedOS: e.target.value }))}
                  options={[
                    { value: "w11x64native", label: "Windows 11 x64 Native" },
                    { value: "w10x64_office", label: "Windows 10 x64 + Office" },
                    { value: "lnxubuntu20", label: "Ubuntu Linux 20.04" },
                    { value: "mac-monterey", label: "macOS Monterey" }
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                    <Clock size={10} className="text-amber-500"/> Limit (s)
                  </label>
                  <input 
                    type="number" 
                    min="30" max="500" 
                    value={analysisTime} 
                    onChange={(e) => setAnalysisTime(e.target.value)}
                    className="w-full p-2.5 bg-[var(--bg-input)] rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-mono text-xs outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                    <Globe size={10} className="text-blue-500"/> Network Mode
                  </label>
                  <CustomSelect 
                    value={networkMode}
                    onChange={(e) => setNetworkMode(e.target.value)}
                    options={[
                      { value: "HTTPS", label: "HTTPS" },
                      { value: "Internet", label: "Internet" },
                      { value: "Airgapped", label: "Airgapped" }
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                  <Shield size={12} className="text-rose-455"/> Analysis Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(codeAnalysis).map(key => (
                    <label key={key} className={`flex items-center gap-2 px-3 py-2 rounded text-[10px] text-[var(--text-primary)] font-mono border cursor-pointer transition-all select-none ${codeAnalysis[key] ? 'border-[var(--accent-blue)] bg-[var(--accent-dim)]' : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-bright)]'}`}>
                      <input 
                        type="checkbox" 
                        checked={codeAnalysis[key]} 
                        onChange={() => toggleCodeAnalysis(key)}
                        className="accent-[var(--accent-blue)]"
                      />
                      {key}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                  <Tag size={12} className="text-indigo-500"/> Tags & Metadata
                </label>
                <input 
                  type="text" 
                  placeholder="APT28, Ransomware..." 
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full p-3 mb-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-mono text-xs outline-none focus:border-indigo-500"
                />
                <label className={`flex items-center gap-2 px-3 py-2 rounded text-[10px] text-[var(--text-primary)] font-mono border cursor-pointer transition-all select-none ${intelligence ? 'border-[var(--accent-blue)] bg-[var(--accent-dim)]' : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-bright)]'}`}>
                  <input 
                    type="checkbox" 
                    checked={intelligence} 
                    onChange={(e) => setIntelligence(e.target.checked)}
                    className="accent-[var(--accent-blue)]"
                  />
                  Enable Reputation Check
                </label>
              </div>
            </div>

            <button 
              onClick={handleStart} 
              disabled={sandboxData.isRunning} 
              className={`w-full py-3 rounded-lg font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer ${sandboxData.isRunning ? 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] cursor-not-allowed opacity-60' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
            >
              <ShieldAlert size={14} />
              {sandboxData.isRunning ? "RUNNING ANALYSIS..." : "LAUNCH CHECK"}
            </button>
            {sandboxData.isRunning && (
              <button 
                onClick={handleStop}
                style={{ color: '#ffffff' }}
                className="w-full bg-red-600 hover:bg-red-500 border border-transparent py-3 rounded-lg font-bold uppercase tracking-wider text-xs text-white transition-all flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                ✕ Stop Analysis
              </button>
            )}
            {error && <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-wider mt-2 bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</p>}
          </div>
        </div>

        {/* 🟢 FORENSIC STREAM */}
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
                  <TerminalSquare size={14} className="text-emerald-500"/> Forensic Audit Output
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                  {sandboxData.isRunning ? "ANALYZING PAYLOAD" : "STANDBY"}
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-xs text-emerald-500/90 scrollbar-thin scrollbar-thumb-white/10 pr-2">
              {sandboxData.logs.length === 0 && <div className="text-gray-600 italic">// Staging system active. Awaiting file import...</div>}
              {sandboxData.logs.map((log, i) => {
                let logColor = "text-slate-400";
                let bgStyle = "";
                if (log.includes('[CRITICAL]') || log.includes('[EVASION]')) { logColor = "text-red-400 font-bold"; bgStyle = "bg-red-500/10 border-l border-red-500 pl-3 py-0.5"; }
                else if (log.includes('[SCAN]') || log.includes('[STATIC]') || log.includes('[CONFIG]') || log.includes('[VERIFY]')) { logColor = "text-cyan-400"; bgStyle = "border-l border-cyan-500/30 pl-2"; }
                else if (log.includes('[NETWORK]')) { logColor = "text-amber-400"; bgStyle = "bg-amber-500/5 border-l border-amber-500 pl-3 py-0.5"; }
                else if (log.includes('[SYSTEM]') || log.includes('[REPORT]')) { logColor = "text-emerald-500"; }
                else if (log.includes('[INFO]') || log.includes('[INTEL]')) { logColor = "text-indigo-400"; bgStyle = "bg-indigo-500/5 border-l border-indigo-500 pl-3 py-0.5"; }
                else if (log.includes('[FILE]') || log.includes('[REGISTRY]')) { logColor = "text-purple-400"; bgStyle = "border-l border-purple-500/30 pl-2"; }

                return (
                  <div key={i} className={`flex gap-3 items-start leading-relaxed ${logColor} ${bgStyle}`}>
                    <span className="opacity-30 text-[10px] w-14 select-none">[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                    <span className="flex-1">{log}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      <ReportPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        type="sandbox"
        data={{
          selectedFile: sandboxData.selectedFile,
          selectedOS: sandboxData.selectedOS,
          logs: sandboxData.logs
        }}
        onDownload={generatePDF}
      />
      </div>
    </div>
  );
};

export default Sandbox;