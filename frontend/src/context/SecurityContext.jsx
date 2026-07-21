import React, { createContext, useState, useContext, useEffect } from 'react';
import API from '../services/api';
import { getWsBaseUrl } from '../config/apiConfig';

const SecurityContext = createContext();

export const SecurityProvider = ({ children }) => {
    // 🟢 EXISTING: DDoS State
    const [ddosData, setDdosData] = useState({
        targetIp: "", logs: [], packetCount: 0, isRunning: false, attackType: "SYN Flood", url: "", duration: 60
    });

    // 🟢 EXISTING: Sandbox State
    const [sandboxData, setSandboxData] = useState({
        selectedFile: null,
        selectedOS: "Windows 10 Pro",
        isRunning: false,
        logs: [],
        analysisReport: null
    });

    // 🔵 NEW: Phishing (Breach Simulation) State
    const [phishingData, setPhishingData] = useState({
        users: [], 
        logs: [], 
        campaignId: "",
        campaignName: "",
        subject: "",
        emails: []
    });

    // 🔵 NEW: Bruteforce & Network Scanner State
    const [scannerData, setScannerData] = useState({
        interfaces: [],
        selectedIface: "",
        targetRange: "192.168.29.0/24",
        liveHosts: [],
        lockedTarget: null,
        auditData: null,
        attackLogs: [],
        isAttacking: false,
        loading: false,
        isAuditing: false
    });

    // 🔵 Persistent Summary Operations Data
    const [summaryData, setSummaryData] = useState({
        total_campaigns: 0,
        total_events: 0,
        phishing_stats: { sent: 0, opened: 0, clicked: 0, submitted: 0 },
        sandbox_events: 0,
        bruteforce_events: 0,
        live_logs: [],
        active_campaign: null,
        latest_campaign: "None",
        last_detonated_file: "None"
    });

    // Persistent background WebSocket listener
    useEffect(() => {
        let ws = null;
        let isCurrent = true;

        const connect = () => {
            if (!isCurrent) return;
            ws = new WebSocket(getWsBaseUrl());
            
            ws.onmessage = (event) => {
                if (!isCurrent) return;
                try {
                    const message = JSON.parse(event.data);
                    let newLog = null;
                    
                    if (message.type === "campaign_update") {
                        API.get("/dashboard/summary").then(res => {
                            if (isCurrent) setSummaryData(res.data);
                        }).catch(e => console.error(e));
                    }
                    
                    // ── Update individual sub-module states in real-time ──
                    if (message.type === "sandbox_status") {
                        setSandboxData(prev => ({ ...prev, isRunning: message.active, logs: [`[SYSTEM] ${message.message}`, ...prev.logs] }));
                    }
                    if (message.type === "sandbox_log") {
                        setSandboxData(prev => ({ ...prev, logs: [message.message, ...prev.logs] }));
                    }

                    if (message.type === "bruteforce_status") {
                        setScannerData(prev => ({ ...prev, isAttacking: message.active }));
                    }
                    if (["execution_step", "bruteforce_attempt", "bruteforce_success"].includes(message.type)) {
                        setScannerData(prev => {
                            let formattedLog = "";
                            let isAttacking = prev.isAttacking;
                            
                            if (message.type === "execution_step") {
                                const prefix = message.command.includes("⚠️") || message.command.includes("Recommendation:") ? "" : "root@kali:~$ ";
                                const isTerminated = message.command.includes("⚠️ KERNEL HALTED") || message.command.includes("actively blocking");
                                formattedLog = `${prefix}${message.command}`;
                                if (isTerminated) isAttacking = false;
                            } else if (message.type === "bruteforce_attempt") {
                                formattedLog = `[PACKET] TCP_SYN → ${message.ip}:${message.port} (AUTH: ${message.user}:${message.pass})`;
                            } else if (message.type === "bruteforce_success") {
                                formattedLog = `[!] SUCCESS: ${message.creds?.user}:${message.creds?.pass} CRACKED ON ${message.ip}`;
                                isAttacking = false;
                            }
                            
                            return {
                                ...prev,
                                attackLogs: [formattedLog, ...prev.attackLogs].slice(0, 100),
                                isAttacking
                            };
                        });
                    }

                    if (message.type === "ddos_status") {
                        setDdosData(prev => ({
                            ...prev,
                            isRunning: message.active,
                            logs: [`[SYSTEM] ${message.message}`, ...prev.logs]
                        }));
                    }
                    if (message.type === "ddos_packet") {
                        setDdosData(prev => ({
                            ...prev,
                            packetCount: message.count,
                            logs: [`[TRAFFIC] OUTBOUND → ${message.count.toLocaleString()} PKTS`, ...prev.logs.slice(0, 100)]
                        }));
                    }
                    
                    setSummaryData(prev => {
                        const updated = { ...prev, phishing_stats: { ...prev.phishing_stats } };
                        
                        // ── Phishing ──
                        if (message.type === "sent") { updated.phishing_stats.sent += 1; updated.total_events += 1; newLog = `[PHISHING] Email sent to ${message.email}`; }
                        if (message.type === "opened") { updated.phishing_stats.opened += 1; updated.total_events += 1; newLog = `[PHISHING] Email opened`; }
                        if (message.type === "clicked") { updated.phishing_stats.clicked += 1; newLog = `[PHISHING] Link clicked`; }
                        if (message.type === "submitted") { updated.phishing_stats.submitted += 1; updated.total_events += 1; newLog = `[CRITICAL] Credentials captured!`; }
                        
                        // ── Sandbox ──
                        if (message.type === "sandbox_status" || message.type === "sandbox_log") {
                            updated.sandbox_events += 1;
                            updated.total_events += 1;
                            newLog = `[SANDBOX] ${message.message}`;
                            if (message.type === "sandbox_status") {
                                const match = message.message.match(/Target:\s*([^\s(]+)/);
                                if (match) {
                                    updated.last_detonated_file = match[1];
                                }
                            }
                        }
                        
                        // ── Bruteforce / Scanner ──
                        if (["execution_step", "bruteforce_attempt", "bruteforce_success"].includes(message.type)) {
                            updated.bruteforce_events += 1;
                            updated.total_events += 1;
                            if (message.command) newLog = `[BRUTEFORCE] ${message.command}`;
                            if (message.type === "bruteforce_success") newLog = `[CRITICAL] Credentials found for ${message.ip}!`;
                        }
                        
                        // ── DDoS ──
                        if (message.type === "ddos_status") {
                            updated.total_events += 1;
                            newLog = `[DDOS] ${message.message}`;
                        }
                        if (message.type === "ddos_packet") {
                            newLog = `[DDOS] ${message.count?.toLocaleString()} pkts → ${message.target}`;
                        }
                        
                        if (newLog) {
                            updated.live_logs = [newLog, ...updated.live_logs].slice(0, 30);
                        }
                        
                        return updated;
                    });
                } catch (e) {
                    console.error("WS background parse error:", e);
                }
            };
            
            ws.onerror = () => {
                // Handle cold-start or temporary disconnect gracefully
            };
            
            ws.onclose = () => {
                if (isCurrent) {
                    setTimeout(connect, 5000);
                }
            };
        };
        
        connect();
        return () => {
            isCurrent = false;
            if (ws) {
                ws.onclose = null;
                ws.close();
            }
        };
    }, []);

    return (
        <SecurityContext.Provider value={{ 
            ddosData, setDdosData, 
            sandboxData, setSandboxData,
            phishingData, setPhishingData,
            scannerData, setScannerData,
            summaryData, setSummaryData
        }}>
            {children}
        </SecurityContext.Provider>
    );
};

export const useSecurity = () => useContext(SecurityContext);