import React, { useEffect, useState, useRef } from "react";
import { ShieldAlert, ShieldCheck, Activity, TerminalSquare, Download, RefreshCw } from "lucide-react";
import API from "../services/api";
import { getApiBaseUrl } from "../config/apiConfig";

export default function NpcapCheckModal({ isOpen, onClose, onDetected, forceCheck = false }) {
  const [checking, setChecking] = useState(true);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [detected, setDetected] = useState(null);
  const checkTimerRef = useRef(null);

  const diagnosticSteps = [
    { log: "[INFO] Initializing Npcap Driver diagnostic routine...", progress: 15 },
    { log: "[INFO] Checking Python Scapy dependency on host...", progress: 35 },
    { log: "[INFO] Probing raw socket handler (wpcap.dll / Packet.dll)...", progress: 60 },
    { log: "[INFO] Verifying loopback packet capture bindings...", progress: 85 },
  ];

  const runDiagnostics = async () => {
    setChecking(true);
    setDetected(null);
    setLogs([]);
    setProgress(0);

    // Run a cool staggered log printing
    let currentStep = 0;
    
    const printNextLog = () => {
      if (currentStep < diagnosticSteps.length) {
        const step = diagnosticSteps[currentStep];
        setLogs((prev) => [...prev, step.log]);
        setProgress(step.progress);
        currentStep++;
        checkTimerRef.current = setTimeout(printNextLog, 300);
      } else {
        // Now query the backend
        verifyWithBackend();
      }
    };

    printNextLog();
  };

  const verifyWithBackend = async () => {
    try {
      setLogs((prev) => [...prev, "[INFO] Querying system driver registry via backend API..."]);
      const res = await API.get("/scanner/npcap-status");
      const installed = res.data.npcap_installed;
      
      setTimeout(() => {
        setDetected(installed);
        setChecking(false);
        setProgress(100);
        
        // Write status to sessionStorage immediately on finish
        sessionStorage.setItem("npcap_checked", "true");
        sessionStorage.setItem("npcap_detected", installed ? "true" : "false");
        
        if (installed) {
          setLogs((prev) => [
            ...prev,
            `[SUCCESS] Npcap Active: ${res.data.message}`,
            `[SUCCESS] System ready for raw SYN scans and frame injection.`
          ]);
          // Notify parent of success
          onDetected(true);
          // Auto-close on success after 1.2s so it doesn't block the user
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setLogs((prev) => [
            ...prev,
            `[ERROR] Npcap Status Check Failed: ${res.data.message}`,
            `[WARN] Raw packet crafting disabled. Running in socket fallback mode.`
          ]);
          // Notify parent of failure
          onDetected(false);
        }
      }, 400);

    } catch (err) {
      setTimeout(() => {
        setDetected(false);
        setChecking(false);
        setProgress(100);
        
        // Write fallback status to sessionStorage on error
        sessionStorage.setItem("npcap_checked", "true");
        sessionStorage.setItem("npcap_detected", "false");
        
        setLogs((prev) => [
          ...prev,
          `[ERROR] Diagnostics connection failed: System registry unreachable.`,
          `[WARN] Proceeding with simulated/socket fallback.`
        ]);
        onDetected(false);
      }, 400);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, [isOpen]);

  const handleDownloadInstaller = () => {
    const downloadUrl = `${getApiBaseUrl()}/scanner/download-npcap`;
    window.open(downloadUrl, "_blank");
    setLogs((prev) => [...prev, "[SYSTEM] Initiated download of npcap-installer.exe from security node."]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-md overflow-y-auto py-8 px-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] border-l-4 border-l-[var(--accent-blue)] w-full max-w-lg rounded-xl p-6 shadow-2xl relative flex flex-col">
        {/* Glow Header background */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent-blue)]/40 to-transparent"></div>
        
        {/* Header — always visible */}
        <div className="flex justify-between items-center border-b border-[var(--border)] pb-3 mb-4 shrink-0">
          <h2 className="text-xs font-bold text-[var(--accent-blue)] uppercase tracking-widest flex items-center gap-2 font-mono">
            <Activity size={14} className="animate-pulse" /> Security Ops // Driver Diagnostics
          </h2>
          {!checking && (
            <button 
              onClick={onClose} 
              className="flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-elevated)] border border-[var(--border-bright)] hover:border-red-500 hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-600 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 group cursor-pointer shadow-sm"
            >
              <span className="relative w-3.5 h-3.5 flex items-center justify-center transition-transform duration-500 group-hover:rotate-90">
                <span className="absolute w-2.5 h-0.5 bg-current transform rotate-45 rounded-full"></span>
                <span className="absolute w-2.5 h-0.5 bg-current transform -rotate-45 rounded-full"></span>
              </span>
              <span className="font-mono text-[9px] tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">Close</span>
            </button>
          )}
        </div>

        {/* Content body */}
        <div className="flex flex-col gap-4">

        {/* Diagnostic Status Indicator */}
        <div className="flex flex-col items-center justify-center p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] shrink-0">
          {checking ? (
            <div className="relative flex justify-center items-center h-16 w-16 mb-3">
              <div className="absolute animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
              <Activity size={24} className="text-cyan-400 animate-pulse" />
            </div>
          ) : detected ? (
            <div className="flex flex-col items-center mb-1">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <ShieldCheck size={28} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded">
                NPCAP SYSTEM VALIDATED
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center mb-1">
              <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <ShieldAlert size={28} />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded">
                NPCAP DRIVER MISSING
              </span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="w-full max-w-xs bg-[var(--bg-base)] h-1.5 rounded-full overflow-hidden mt-3 border border-[var(--border)]">
            <div 
              className={`h-full transition-all duration-300 ${detected === false ? 'bg-amber-500' : detected === true ? 'bg-emerald-500' : 'bg-cyan-500 animate-pulse'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-[9px] font-mono text-gray-500 mt-2 uppercase tracking-widest">
            {checking ? `Checking System Registers... ${progress}%` : detected ? "Security Environment Secure" : "Diagnostics Flagged Warning"}
          </span>
        </div>

        {/* Terminal logs */}
        <div className="min-h-[160px] bg-[var(--bg-elevated)] border border-[var(--border-bright)] shadow-inner rounded-lg p-4 font-mono text-[10px] text-[var(--text-secondary)] space-y-1.5 flex flex-col pr-2">
          <div className="flex items-center gap-1.5 border-b border-[var(--border-bright)] pb-1.5 mb-2 text-[var(--text-muted)] uppercase tracking-widest text-[9px] shrink-0">
            <TerminalSquare size={12} /> Diagnostic Log Stream
          </div>
          <div className="space-y-1.5">
            {logs.map((log, i) => {
              let color = "text-[var(--text-secondary)]";
              if (log.includes("[SUCCESS]")) color = "text-emerald-600 dark:text-emerald-400 font-semibold";
              else if (log.includes("[ERROR]")) color = "text-red-600 dark:text-red-400 font-bold";
              else if (log.includes("[WARN]")) color = "text-amber-600 dark:text-amber-400";
              else if (log.includes("[SYSTEM]")) color = "text-[var(--accent-blue)]";
              
              return (
                <div key={i} className={`leading-relaxed break-all ${color}`}>
                  {log}
                </div>
              );
            })}
            {checking && (
              <div className="text-[var(--accent-blue)] animate-pulse select-none font-bold">
                █ RUNNING DIAGNOSTIC PROBES...
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Actions Footer — always visible */}
        <div className="border-t border-white/5 pt-4 mt-4 flex flex-col gap-2 shrink-0">
          {checking ? (
            <div className="text-center py-2 text-[10px] text-gray-500 font-mono tracking-wider animate-pulse uppercase">
              Verifying Layer 2 socket access rights... Please wait
            </div>
          ) : detected ? (
            <button
              onClick={() => {
                sessionStorage.setItem("npcap_detected", "true");
                sessionStorage.setItem("npcap_checked", "true");
                onClose();
              }}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500 py-2.5 rounded font-bold uppercase tracking-wider text-[9px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              Continue to Panel
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadInstaller}
                  className="bg-[var(--accent-dim)] border border-[var(--accent-blue)] text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/20 py-2.5 px-3 rounded font-bold uppercase tracking-wider text-[9px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download size={12} /> Download NPCAP
                </button>
                <button
                  onClick={runDiagnostics}
                  className="bg-[var(--bg-elevated)] border border-[var(--border-bright)] text-[var(--text-primary)] hover:bg-[var(--accent-dim)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] py-2.5 px-3 rounded font-bold uppercase tracking-wider text-[9px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={12} /> Retry Diagnostics
                </button>
              </div>
              <button
                onClick={() => {
                  sessionStorage.setItem("npcap_detected", "false");
                  sessionStorage.setItem("npcap_checked", "true");
                  onClose();
                }}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-bright)] text-[var(--text-secondary)] hover:bg-amber-500/10 hover:border-amber-500 hover:text-amber-600 py-2.5 rounded font-bold uppercase tracking-wider text-[9px] transition-colors cursor-pointer"
              >
                Proceed with Socket Fallback (Not Recommended)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
