import * as XLSX from "xlsx";
import { useEffect, useState, useContext } from "react";
import API from "../services/api";
import { getWsBaseUrl } from "../config/apiConfig";
import { Chart as ArcChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Crosshair, ShieldAlert, FileSpreadsheet, Send, TerminalSquare, LayoutGrid, Download, History, Trash2, Sliders, Eye } from "lucide-react";

import CustomSelect from '../components/CustomSelect';
import ConfirmModal from '../components/ConfirmModal';
import ReportPreviewModal from '../components/ReportPreviewModal';
import { AuthContext } from "../context/AuthContext";
ArcChartJS.register(ArcElement, Tooltip, Legend);

export default function Phishing() {
  const { user } = useContext(AuthContext);
  const [campaigns, setCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [emails, setEmails] = useState(() => {
    const saved = sessionStorage.getItem("phish_emails");
    return saved ? JSON.parse(saved) : [];
  });
  const [subject, setSubject] = useState(() => sessionStorage.getItem("phish_subject") || "");
  const [campaignName, setCampaignName] = useState(() => sessionStorage.getItem("phish_campaignName") || "");
  const [template, setTemplate] = useState(() => sessionStorage.getItem("phish_template") || "security");
  const [isSending, setIsSending] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState([]);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  // Sync draft form data to session storage to persist across tabs
  useEffect(() => {
    sessionStorage.setItem("phish_emails", JSON.stringify(emails));
    sessionStorage.setItem("phish_subject", subject);
    sessionStorage.setItem("phish_campaignName", campaignName);
    sessionStorage.setItem("phish_template", template);
  }, [emails, subject, campaignName, template]);

   const [logs, setLogs] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [notification, setNotification] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [summaryStats, setSummaryStats] = useState(null);
  const [reportSelectModal, setReportSelectModal] = useState({
    isOpen: false,
    actionType: "", // "preview" | "download"
    selectionType: "all", // "all" | "selected"
    tempSelectedIds: [], // list of campaign IDs
  });

  // Fetch summary stats for security score mapping
  useEffect(() => {
    API.get("/dashboard/summary")
      .then((res) => setSummaryStats(res.data))
      .catch((err) => console.error("Summary Sync Error:", err));
  }, [campaignId, isPreviewOpen]);

  useEffect(() => {
    API.get("/dashboard/campaigns").then((res) => {
      setCampaigns(res.data);
      if (!campaignId) {
        const active = res.data.find(c => c.status === "active");
        if (active) {
          setCampaignId(active.id);
        } else {
          setCampaignId("");
        }
      }
    });

    if (campaignId) {
      API.get(`/dashboard/phishing/${campaignId}/details`)
        .then((res) => {
          setUsers(res.data);
          // Set target emails list based on the targets from this campaign
          if (res.data && res.data.length > 0) {
            setEmails(res.data.map(u => u.email));
          }
        })
        .catch((err) => console.error("Sync Error:", err));
    }

    const ws = new WebSocket(getWsBaseUrl());

    ws.onopen = () => {
      console.log("📡 Breach Stream Connected");
    };

    ws.onerror = () => {
      // Handle socket error gracefully
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const time = new Date().toLocaleTimeString();

        const logEntry = `[${time}] ${message.type.toUpperCase()} → ${message.email || message.tracking_id}`;
        setLogs((prev) => [logEntry, ...prev]);

        setUsers((prev) => {
          let updated = [...prev];
          let userIndex = updated.findIndex((u) => u.tracking_id === message.tracking_id || u.email === message.email);

          if (userIndex !== -1) {
            if (message.type === "sent") updated[userIndex].sent = true;
            if (message.type === "opened") updated[userIndex].opened = true;
            if (message.type === "clicked") updated[userIndex].clicked = true;
            if (message.type === "submitted") {
              updated[userIndex].submitted = true;
              updated[userIndex].capturedUsername = message.email; 
              updated[userIndex].password = message.password;
              updated[userIndex].opened = true;
              updated[userIndex].clicked = true;
            }
          } else {
            updated.push({
              email: message.email || "unknown",
              sent: message.type === "sent",
              opened: message.type === "opened",
              clicked: message.type === "clicked",
              submitted: message.type === "submitted",
              capturedUsername: message.type === "submitted" ? message.email : "",
              password: message.password || "",
              tracking_id: message.tracking_id
            });
          }
          return [...updated];
        });
      } catch (e) {
        console.error("WS Packet Error:", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [campaignId]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const extracted = json.flat().filter(val => val && typeof val === "string" && val.includes("@"));
      setEmails(extracted);
    };
    reader.readAsArrayBuffer(file);
  };

  const sendEmails = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      const res = await API.post("/phishing/send", {
        emails,
        subject,
        campaign_name: campaignName,
        template,
        campaign_id: campaignId ? parseInt(campaignId) : null,
      });
      setCampaignId(res.data.campaign_id);

      // Refresh campaign list
      const campsRes = await API.get("/dashboard/campaigns");
      setCampaigns(campsRes.data);

      setNotification({
        type: "success",
        title: "Simulation Deployed",
        message: "Breach social engineering simulation launched successfully."
      });
    } catch (err) {
      setNotification({
        type: "error",
        title: "Deployment Failed",
        message: "Failed to deploy the social engineering simulation. Check parameters."
      });
    } finally {
      setIsSending(false);
    }
  };

  const stopCampaign = async (idToStop) => {
    const targetId = idToStop || campaignId;
    if (!targetId) return;
    try {
      await API.post(`/phishing/${targetId}/stop`);
      // Refresh campaign list
      const campsRes = await API.get("/dashboard/campaigns");
      setCampaigns(campsRes.data);
      setNotification({
        type: "success",
        title: "Simulation Stopped",
        message: "Phishing campaign has been stopped successfully."
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Stop Failed",
        message: "Failed to stop the campaign. Try again."
      });
    }
  };

  const triggerConfirm = (title, message, onConfirm) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    });
  };

  const handleDeleteCampaignClick = (id) => {
    triggerConfirm(
      "Delete Campaign",
      "Are you sure you want to delete this campaign? All logs and credentials associated with it will be permanently removed.",
      async () => {
        try {
          await API.delete(`/phishing/${id}`);
          // Refresh campaign list
          const campsRes = await API.get("/dashboard/campaigns");
          setCampaigns(campsRes.data);
          if (String(campaignId) === String(id)) {
            setCampaignId("");
            setCampaignName("");
            setUsers([]);
          }
          setSelectedCampaignIds(prev => prev.filter(cId => String(cId) !== String(id)));
          setNotification({
            type: "success",
            title: "Campaign Deleted",
            message: "Phishing campaign deleted successfully."
          });
        } catch (err) {
          console.error(err);
          setNotification({
            type: "error",
            title: "Delete Failed",
            message: "Failed to delete the campaign."
          });
        }
      }
    );
  };

  const handleDeleteSelectedClick = () => {
    if (selectedCampaignIds.length === 0) return;
    triggerConfirm(
      "Delete Selected Campaigns",
      `Are you sure you want to delete the ${selectedCampaignIds.length} selected campaigns? All logs, exfiltrated credentials, and events associated with them will be permanently removed.`,
      async () => {
        try {
          await API.post("/phishing/delete/bulk", { campaign_ids: selectedCampaignIds });
          // Refresh campaign list
          const campsRes = await API.get("/dashboard/campaigns");
          setCampaigns(campsRes.data);
          if (selectedCampaignIds.map(String).includes(String(campaignId))) {
            setCampaignId("");
            setCampaignName("");
            setUsers([]);
          }
          setSelectedCampaignIds([]);
          setNotification({
            type: "success",
            title: "Campaigns Deleted",
            message: "Selected campaigns deleted successfully."
          });
        } catch (err) {
          console.error(err);
          setNotification({
            type: "error",
            title: "Delete Failed",
            message: "Failed to delete selected campaigns."
          });
        }
      }
    );
  };

  const handleDeleteAllClick = () => {
    triggerConfirm(
      "Wipe All Campaigns",
      "WARNING: Are you absolutely sure you want to delete ALL campaigns, events, and credentials? This action cannot be undone and will permanently wipe the database history.",
      async () => {
        try {
          await API.delete("/phishing/delete/all");
          // Refresh campaign list
          const campsRes = await API.get("/dashboard/campaigns");
          setCampaigns(campsRes.data);
          setCampaignId("");
          setCampaignName("");
          setUsers([]);
          setSelectedCampaignIds([]);
          setNotification({
            type: "success",
            title: "All Campaigns Deleted",
            message: "All campaign records wiped successfully."
          });
        } catch (err) {
          console.error(err);
          setNotification({
            type: "error",
            title: "Delete Failed",
            message: "Failed to wipe all campaigns."
          });
        }
      }
    );
  };

  const compromisedCount = users.filter((u) => u.submitted).length;
  const chartData = {
    labels: ["Compromised", "Safe"],
    datasets: [
      {
        data: [compromisedCount, Math.max(users.length - compromisedCount, 1)],
        backgroundColor: ["#ef4444", "rgba(255,255,255,0.05)"],
        borderWidth: 0,
      },
    ],
  };

  const handleDownloadReport = async () => {
    if (!campaignId) {
      setNotification({
        type: "error",
        title: "Selection Required",
        message: "Please select or deploy a campaign before generating a report."
      });
      return;
    }
    
    try {
      const response = await API.get(`/export/${campaignId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const companyName = (user?.name || "audit").replace(/\s+/g, "_").toLowerCase();
      link.setAttribute('download', `roblocksec_phishing_${companyName}_campaign_${campaignId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Export Failed",
        message: "Failed to export campaign report PDF file. Try again."
      });
    }
  };

  const activeCampaign = campaigns.find(c => c.status === "active");
  const selectedCampaign = campaigns.find(c => String(c.id) === String(campaignId));
  const isViewingInactive = (selectedCampaign && selectedCampaign.status !== "active") || campaignId === "all" || String(campaignId).includes(",");

  return (
    <div className="p-6 md:p-8 bg-[#0a1128] min-h-screen text-slate-200 relative">
      
      {/* 🟢 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6 mb-8 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
            <Crosshair className="text-blue-500" size={32} />
            Phishing Campaigns
          </h1>
          <p className="text-slate-400 mt-1 text-xs">Credential harvesting and corporate social engineering simulation vectors.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => {
              if (campaigns.length === 0) {
                setNotification({
                  type: "error",
                  title: "No Campaigns Found",
                  message: "You must run at least one simulation before generating a report."
                });
                return;
              }
              setReportSelectModal({
                isOpen: true,
                actionType: "preview",
                selectionType: campaignId ? "selected" : "all",
                tempSelectedIds: campaignId ? [String(campaignId)] : [],
              });
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 px-4 py-2 rounded-lg text-white text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <Eye size={14} />
            Preview Report
          </button>
          <button 
            onClick={() => {
              if (campaigns.length === 0) {
                setNotification({
                  type: "error",
                  title: "No Campaigns Found",
                  message: "You must run at least one simulation before generating a report."
                });
                return;
              }
              setReportSelectModal({
                isOpen: true,
                actionType: "download",
                selectionType: campaignId ? "selected" : "all",
                tempSelectedIds: campaignId ? [String(campaignId)] : [],
              });
            }}
            className="flex items-center gap-2 bg-[var(--bg-elevated)] hover:bg-[var(--accent-dim)] border border-[var(--border-bright)] px-4 py-2 rounded-lg text-[var(--text-primary)] hover:text-[var(--accent-blue)] text-xs font-bold transition-all cursor-pointer"
          >
            <Download size={14} />
            Export PDF Report
          </button>
          
          {activeCampaign && (
            <button 
              onClick={() => stopCampaign(activeCampaign.id)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 border border-transparent px-4 py-2 rounded-lg text-white text-xs font-bold transition-all cursor-pointer shadow-md"
            >
              ✕ Stop Simulation
            </button>
          )}
          
          <div className="flex items-center gap-4 bg-[var(--bg-surface)] border border-[var(--border)] px-5 py-3 rounded-xl shadow-md">
            <div>
              <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Interception Rate</p>
              <h2 className="text-xl font-bold text-red-500">
                {((compromisedCount / Math.max(users.length, 1)) * 100).toFixed(1)}%
              </h2>
            </div>
            <div className="w-10 h-10">
              <Doughnut data={chartData} options={{ cutout: "75%", plugins: { legend: { display: false }, tooltip: { enabled: false } } }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* 🟢 CONFIGURATION PANEL */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Campaign History Selector */}
          <div className="bg-[#111827] p-6 rounded-xl border border-white/5">
             <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <History className="text-purple-400" size={16} />
                <h2 className="text-xs font-bold uppercase text-white tracking-wider">Campaign History</h2>
              </div>
              <button 
                onClick={() => {
                  if (activeCampaign) return;
                  setIsManagerOpen(true);
                }}
                disabled={!!activeCampaign}
                className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors uppercase border px-2 py-1 rounded bg-blue-500/5 ${activeCampaign ? 'text-gray-500 border-gray-700/50 bg-transparent cursor-not-allowed' : 'text-blue-400 hover:text-blue-300 border-blue-500/20 cursor-pointer animate-pulse hover:animate-none'}`}
              >
                <Sliders size={10} /> Manage
              </button>
            </div>
            <CustomSelect 
              value={campaignId}
              disabled={!!activeCampaign}
              onChange={(e) => {
                const id = e.target.value;
                setCampaignId(id);
                const selected = campaigns.find(c => String(c.id) === String(id));
                if (selected) {
                  setCampaignName(selected.name || "");
                  setSubject(selected.subject || "");
                  setTemplate(selected.template || "security");
                } else {
                  setCampaignName("");
                  setSubject("");
                  setTemplate("security");
                  setEmails([]);
                  setUsers([]);
                }
              }}
              options={[
                { value: "", label: "-- Select Past Campaign --" },
                ...campaigns.map(c => ({
                  value: String(c.id),
                  label: `${c.name || `Campaign #${c.id}`} (Status: ${c.status})`
                }))
              ]}
            />
            {activeCampaign && (
              <p className="text-[10px] text-amber-500 mt-2 font-mono">
                ⚠️ Active simulation running. Stop it to switch campaigns.
              </p>
            )}
          </div>

          {/* Setup New Attack */}
          <div className="bg-[#111827] p-6 rounded-xl border border-white/5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
              <ShieldAlert className="text-blue-400" size={16} />
              <h2 className="text-xs font-bold uppercase text-white tracking-wider">Setup Campaign</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">Campaign Name</label>
                <input 
                  placeholder="e.g. Q3 Compliance Phish" 
                  className={`w-full p-3 bg-black/40 rounded-lg border border-white/10 text-white outline-none focus:border-blue-500 focus:bg-white/5 transition-all text-xs ${isViewingInactive ? 'opacity-65 cursor-not-allowed' : ''}`} 
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)} 
                  disabled={isViewingInactive}
                />
              </div>
              
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">Target Emails</label>
                <textarea 
                  placeholder="john@corp.com, jane@corp.com..." 
                  className={`w-full p-3 bg-black/40 rounded-lg border border-white/10 text-white h-20 outline-none focus:border-blue-500 focus:bg-white/5 transition-all text-xs resize-none ${isViewingInactive ? 'opacity-65 cursor-not-allowed' : ''}`} 
                  value={emails.join(",")} 
                  onChange={(e) => setEmails(e.target.value.split(","))} 
                  disabled={isViewingInactive}
                />
              </div>

              <div className={`p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl flex flex-col gap-3 ${isViewingInactive ? 'opacity-65 cursor-not-allowed' : ''}`}>
                <label className="text-[10px] text-[var(--text-secondary)] font-bold uppercase flex items-center gap-1.5 cursor-pointer select-none">
                  <FileSpreadsheet size={12} className="text-cyan-500" /> Bulk Excel Upload (.xlsx, .csv)
                </label>
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload} 
                  disabled={isViewingInactive}
                  className={`text-xs text-[var(--text-secondary)] file:mr-3 file:py-1.5 file:px-3.5 file:rounded-lg file:border-0 ${isViewingInactive ? 'file:bg-cyan-800/40 file:text-white/40 cursor-not-allowed' : 'file:bg-cyan-600 file:text-white hover:file:bg-cyan-500'} file:font-semibold file:transition-colors file:cursor-pointer`}
                  style={{ color: 'var(--text-secondary)' }}
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">Subject Line</label>
                <input 
                  placeholder="URGENT: Password Expiry Notification" 
                  className={`w-full p-3 bg-black/40 rounded-lg border border-white/10 text-white outline-none focus:border-blue-500 focus:bg-white/5 transition-all text-xs ${isViewingInactive ? 'opacity-65 cursor-not-allowed' : ''}`} 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)} 
                  disabled={isViewingInactive}
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5 block">Payload Template</label>
                <CustomSelect 
                  value={template} 
                  onChange={(e) => setTemplate(e.target.value)}
                  disabled={isViewingInactive}
                  options={[
                    { value: "security", label: "Security Update Required" },
                    { value: "reset", label: "IT Password Reset Link" },
                    { value: "suspension", label: "Account Inactivity Audit" }
                  ]}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button 
                onClick={sendEmails} 
                disabled={isSending || isViewingInactive}
                className={`flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${isSending ? 'bg-blue-800 text-white cursor-not-allowed opacity-75' : isViewingInactive ? 'bg-gray-800 text-gray-400 border border-gray-700/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
              >
                {isViewingInactive ? (
                  <>Locked</>
                ) : (
                  <>
                    <Send size={14} /> {isSending ? "Sending..." : "Send"}
                  </>
                )}
              </button>
              <button 
                onClick={() => {
                  setCampaignId("");
                  setCampaignName("");
                  setEmails([]);
                  setSubject("");
                  setTemplate("security");
                  setUsers([]);
                  sessionStorage.removeItem("phish_emails");
                  sessionStorage.removeItem("phish_subject");
                  sessionStorage.removeItem("phish_campaignName");
                  sessionStorage.removeItem("phish_template");
                }}
                className="px-4 py-3 bg-[var(--bg-elevated)] hover:bg-[var(--accent-dim)] border border-[var(--border-bright)] text-[var(--text-primary)] hover:text-red-500 rounded-lg font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Reset
              </button>
            </div>
            {campaignId && campaigns.find(c => String(c.id) === String(campaignId))?.status === "active" && (
              <button 
                onClick={() => stopCampaign(campaignId)} 
                style={{ color: '#ffffff' }}
                className="w-full bg-red-600 hover:bg-red-500 border border-transparent py-3 rounded-lg font-bold uppercase tracking-wider text-xs text-white transition-all flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
              >
                ✕ Stop Simulation
              </button>
            )}
          </div>
        </div>

        {/* 🟢 INTERCEPTION MATRIX & LIVE CONSOLE */}
        <div className="xl:col-span-8 space-y-6 flex flex-col">
          <div className="bg-[#111827] p-6 rounded-xl border border-white/5 flex-1 flex flex-col">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-4">
              <LayoutGrid className="text-blue-400" size={16} />
              <h2 className="text-xs font-bold uppercase text-white tracking-wider">Interception Matrix</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-white/5 uppercase text-[9px] font-bold tracking-wider">
                    <th className="pb-3 pl-3">Target Identity</th>
                    <th className="pb-3 text-center">Sent</th>
                    <th className="pb-3 text-center">Opened</th>
                    <th className="pb-3 text-center">Captured Username</th>
                    <th className="pb-3 text-right pr-3">Exfiltrated Password</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500 italic text-xs">No simulation stats collected.</td>
                    </tr>
                  )}
                  {users.map((u, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 pl-3 font-mono text-blue-400 text-xs">{u.email}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex h-2 w-2 rounded-full ${u.sent || u.opened || u.clicked || u.submitted ? 'bg-blue-500' : 'bg-gray-700'}`}></span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex h-2 w-2 rounded-full ${u.opened ? 'bg-emerald-500' : 'bg-gray-700'}`}></span>
                      </td>
                      <td className="py-3 text-center font-mono text-slate-300">
                        {u.submitted ? (u.capturedUsername || u.email) : <span className="text-gray-700">---</span>}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono text-red-400 font-bold">
                        {u.submitted ? u.password : <span className="text-gray-600 italic text-[10px]">Awaiting</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🟢 LIVE CONSOLE */}
          <div className="bg-[#030712] p-6 rounded-xl border border-white/5 h-[230px] flex flex-col">
            <div className="text-[10px] font-black text-white uppercase tracking-widest mb-3 border-b border-white/5 pb-2 flex justify-between items-center">
              <span className="flex items-center gap-1.5"><TerminalSquare size={14} className="text-emerald-500"/> Intel Output Feed</span>
              <span className="text-emerald-500 animate-pulse font-mono text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">LIVE_CAP</span>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-emerald-400 text-xs space-y-1 pr-2 scrollbar-thin scrollbar-thumb-white/10">
              {logs.length === 0 && <div className="text-gray-600 italic">// Awaiting simulation capture...</div>}
              {logs.map((log, i) => (
                <div key={i} className="border-l border-emerald-500 pl-3 py-0.5 text-emerald-400/90">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 CAMPAIGN MANAGER MODAL */}
      {isManagerOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-4 mb-4 select-none">
              <div className="flex items-center gap-3">
                <Sliders className="text-[var(--accent-blue)]" size={20} />
                <h3 className="text-sm font-bold uppercase text-[var(--text-primary)] tracking-wider font-mono">Campaign Manager</h3>
              </div>
              <button 
                onClick={() => {
                  setIsManagerOpen(false);
                  setSelectedCampaignIds([]);
                }} 
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Bulk Operations Toolbar */}
            <div className="flex justify-between items-center bg-[var(--bg-elevated)] border border-[var(--border)] p-3 rounded-lg mb-4 text-xs font-mono select-none">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  checked={campaigns.length > 0 && selectedCampaignIds.length === campaigns.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCampaignIds(campaigns.map(c => c.id));
                    } else {
                      setSelectedCampaignIds([]);
                    }
                  }}
                  className="rounded border-[var(--border)] bg-[var(--bg-input)] text-blue-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-[var(--text-secondary)]">Select All ({selectedCampaignIds.length}/{campaigns.length})</span>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDeleteSelectedClick}
                  disabled={selectedCampaignIds.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer border ${
                    selectedCampaignIds.length === 0 
                      ? 'bg-transparent text-[var(--text-muted)] border-[var(--border)] cursor-not-allowed' 
                      : 'bg-red-50 hover:bg-red-100 text-red-650 border-red-200 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
                  }`}
                >
                  <Trash2 size={12} /> Delete Selected
                </button>
                <button
                  onClick={handleDeleteAllClick}
                  disabled={campaigns.length === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer border ${
                    campaigns.length === 0
                      ? 'bg-transparent text-[var(--text-muted)] border-[var(--border)] cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-500 border-transparent text-white'
                  }`}
                  style={{
                    color: campaigns.length === 0 ? "var(--text-muted)" : "#ffffff"
                  }}
                >
                  ✕ Wipe All
                </button>
              </div>
            </div>

            {/* Campaign List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10 font-mono">
              {campaigns.length === 0 ? (
                <div className="text-center text-[var(--text-muted)] italic py-12 text-xs">// Directory empty.</div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {campaigns.map((c) => (
                    <div key={c.id} className="flex justify-between items-center py-3 hover:bg-[var(--bg-elevated)] px-2 rounded transition-colors text-xs">
                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                        <input 
                          type="checkbox"
                          checked={selectedCampaignIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCampaignIds(prev => [...prev, c.id]);
                            } else {
                              setSelectedCampaignIds(prev => prev.filter(id => id !== c.id));
                            }
                          }}
                          className="rounded border-[var(--border)] bg-[var(--bg-input)] text-blue-500 focus:ring-0 cursor-pointer"
                        />
                        <div className="truncate">
                          <p className="font-semibold text-[var(--text-primary)] truncate">{c.name || `Campaign #${c.id}`}</p>
                          <p className="text-[9px] text-[var(--text-muted)] mt-0.5">ID: {c.id} • Created: {new Date(c.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold font-mono uppercase ${
                          c.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20' 
                            : 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border border-gray-500/20'
                        }`}>
                          {c.status}
                        </span>
                        <button
                          onClick={() => handleDeleteCampaignClick(c.id)}
                          className="text-[var(--text-muted)] hover:text-red-500 hover:bg-[var(--bg-elevated)] transition-colors p-1.5 cursor-pointer rounded"
                          title="Delete Campaign"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border)] pt-4 mt-4 flex justify-end text-[9px] text-[var(--text-muted)] font-mono">
              // DCD penetrative auditing
            </div>

          </div>
        </div>
      )}

      {/* 🟢 CUSTOM CONFIRMATION DIALOG MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        variant="danger"
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
            <div className="space-y-4">
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
                  if (reportSelectModal.selectionType === "all") {
                    targetId = "all";
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
                  }
                  
                  // Close this modal
                  setReportSelectModal(prev => ({ ...prev, isOpen: false }));
                  
                  // Set main page campaign id so details load
                  setCampaignId(targetId);
                  if (targetId === "all") {
                    setCampaignName("All Previous Campaigns");
                    setSubject("Integrated Audits");
                    setTemplate("security");
                  } else if (targetId.includes(",")) {
                    setCampaignName("Selected Campaigns");
                    setSubject("Selected Audits");
                    setTemplate("security");
                  } else {
                    const selected = campaigns.find(c => String(c.id) === String(targetId));
                    if (selected) {
                      setCampaignName(selected.name || "");
                      setSubject(selected.subject || "");
                      setTemplate(selected.template || "security");
                    }
                  }
                  
                  // Proceed with Action
                  if (reportSelectModal.actionType === "preview") {
                    setIsPreviewOpen(true);
                  } else {
                    // Download PDF
                    try {
                      const response = await API.get(`/export/${targetId}/pdf`, {
                        responseType: 'blob'
                      });
                      const url = window.URL.createObjectURL(new Blob([response.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      const companyName = (user?.name || "audit").replace(/\s+/g, "_").toLowerCase();
                      const safeCampaignStr = targetId.replace(/,/g, "_");
                      link.setAttribute('download', `roblocksec_phishing_${companyName}_campaign_${safeCampaignStr}.pdf`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    } catch (err) {
                      console.error(err);
                      setNotification({
                        type: "error",
                        title: "Export Failed",
                        message: "Failed to export campaign report PDF file. Try again."
                      });
                    }
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
        type="phishing"
        data={{
          campaignId: campaignId,
          campaignName: campaignId === "all" ? "All Previous Campaigns" : campaignId.includes(",") ? "Selected Campaigns" : (campaigns.find(c => c.id === parseInt(campaignId))?.name || "Tactical Phishing Simulation"),
          subject: subject,
          template: template,
          users: users,
          summaryStats: summaryStats
        }}
        onDownload={handleDownloadReport}
      />

    </div>
  );
}