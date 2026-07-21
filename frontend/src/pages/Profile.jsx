import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { 
  Building, Mail, Phone, Shield, Key, Award, LogOut, Terminal, 
  CheckCircle2, Edit3, Clipboard, RefreshCw, AlertCircle, Save, X 
} from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import { motion, AnimatePresence } from "framer-motion";

export default function Profile() {
  const { user, logout, updateProfile } = useContext(AuthContext);
  const [apiKey, setApiKey] = useState("DCD-A8X9-K2L9-0823-1102");
  const [showKey, setShowKey] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [activeTab, setActiveTab] = useState("identity"); // "identity" | "gateway"

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    first_name: "",
    last_name: "",
    phone_number: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Copy state
  const [copied, setCopied] = useState(false);


  // Set form data when user is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone_number: user.phone_number || "",
      });
    }
  }, [user]);

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Form Submit Handler
  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsSaving(true);

    try {
      await updateProfile(formData);
      setSuccessMsg("Profile identity registry updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Failed to update profile registry details.");
    } finally {
      setIsSaving(false);
    }
  };

  // Copy to clipboard
  const handleCopyToken = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 font-sans transition-all duration-300">
      
      {/* 🟢 DYNAMIC TOP GLOW BAR */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-0.5" style={{ borderRadius: '12px' }}>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10" style={{ borderRadius: '11px' }}>
          {/* Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>
          
          <div className="flex items-center gap-5 relative">
            {/* Avatar Squircle with Glow */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)] shrink-0 border border-purple-400/30 text-white font-mono text-2xl font-bold select-none relative" style={{ borderRadius: '14px' }}>
              {user?.name?.substring(0, 2).toUpperCase() || "OP"}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[var(--bg-surface)] flex items-center justify-center" title="Online">
                <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></span>
              </span>
            </div>
            
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-wider font-mono">
                  {user?.name || "Official Organization"}
                </h1>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-widest">
                  ORG-00{user?.id || "N/A"}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase mt-1 tracking-widest font-mono flex items-center gap-1.5">
                <Shield size={12} className="text-purple-400" /> FEDERAL AUDIT REGISTRY // LEVEL-5 SECURITY CLEARANCE
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowConfirmLogout(true)}
            className="flex items-center gap-2 px-5 py-2.5 border border-red-500/30 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-500 hover:text-red-650 dark:text-red-400 dark:hover:text-red-300 rounded-lg font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer shrink-0 font-mono shadow-[0_0_15px_rgba(239,68,68,0.05)] active:scale-95 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]"
            style={{ borderRadius: '8px' }}
          >
            <LogOut size={13} /> Decommission Session
          </button>
        </div>
      </div>

      {/* 🟢 TABS NAVIGATION */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-px">
        <button
          onClick={() => setActiveTab("identity")}
          className={`px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b-2 cursor-pointer ${
            activeTab === "identity" 
              ? "text-[var(--accent-blue)] border-[var(--accent-blue)] bg-[var(--accent-dim)]" 
              : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          }`}
          style={{ borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}
        >
          [ Identity Registry ]
        </button>
        <button
          onClick={() => setActiveTab("gateway")}
          className={`px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 border-b-2 cursor-pointer ${
            activeTab === "gateway" 
              ? "text-purple-600 dark:text-purple-400 border-purple-500 bg-purple-500/10" 
              : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          }`}
          style={{ borderTopLeftRadius: '6px', borderTopRightRadius: '6px' }}
        >
          [ Gateway Access Key ]
        </button>
      </div>

      {/* 🟢 TAB CONTENT */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {activeTab === "identity" ? (
            <motion.div
              key="identity-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {/* Left Details Panel */}
              <div className="md:col-span-2 space-y-6">
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 shadow-xl relative" style={{ borderRadius: '12px' }}>
                  {/* Subtle Tech accents */}
                  <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:16px_16px] opacity-10 pointer-events-none rounded-2xl"></div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-2xl pointer-events-none rounded-full"></div>
                  
                  <div className="flex justify-between items-center border-b border-[var(--border)] pb-4 mb-6">
                    <div className="flex items-center gap-2.5">
                      <Building className="text-[var(--accent-blue)] animate-pulse" size={16} />
                      <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest font-mono">Operator Information Settings</h2>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--accent-blue)]/30 hover:border-[var(--accent-blue)] bg-[var(--accent-dim)] text-[var(--accent-blue)] rounded font-bold text-[10px] tracking-wider uppercase transition-all duration-200 cursor-pointer font-mono"
                        style={{ borderRadius: '6px' }}
                      >
                        <Edit3 size={11} /> Modify Registry
                      </button>
                    )}
                  </div>

                  {successMsg && (
                    <div className="p-3 mb-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs rounded-lg flex items-center gap-2" style={{ borderRadius: '8px' }}>
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3 mb-5 bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs rounded-lg flex items-center gap-2" style={{ borderRadius: '8px' }}>
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Company Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono font-bold block">Company / Org Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] px-3.5 py-2 text-sm transition-all duration-200 focus:border-[var(--accent-blue)]/50 focus:shadow-[0_0_12px_rgba(27,78,140,0.15)] font-mono outline-none"
                            style={{ borderRadius: '6px' }}
                          />
                        ) : (
                          <div className="bg-[var(--bg-elevated)] border border-[var(--border)] px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)]" style={{ borderRadius: '6px' }}>
                            {user?.name || "N/A"}
                          </div>
                        )}
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono font-bold block">Secure Line (Phone)</label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="phone_number"
                            value={formData.phone_number}
                            onChange={handleInputChange}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] px-3.5 py-2 text-sm transition-all duration-200 focus:border-[var(--accent-blue)]/50 focus:shadow-[0_0_12px_rgba(27,78,140,0.15)] font-mono outline-none"
                            style={{ borderRadius: '6px' }}
                          />
                        ) : (
                          <div className="bg-[var(--bg-elevated)] border border-[var(--border)] px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)]" style={{ borderRadius: '6px' }}>
                            {user?.phone_number || "No Phone Registered"}
                          </div>
                        )}
                      </div>

                      {/* First Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono font-bold block">First Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] px-3.5 py-2 text-sm transition-all duration-200 focus:border-[var(--accent-blue)]/50 focus:shadow-[0_0_12px_rgba(27,78,140,0.15)] font-mono outline-none"
                            style={{ borderRadius: '6px' }}
                          />
                        ) : (
                          <div className="bg-[var(--bg-elevated)] border border-[var(--border)] px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)]" style={{ borderRadius: '6px' }}>
                            {user?.first_name || "Not Configured"}
                          </div>
                        )}
                      </div>

                      {/* Last Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono font-bold block">Last Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleInputChange}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] px-3.5 py-2 text-sm transition-all duration-200 focus:border-[var(--accent-blue)]/50 focus:shadow-[0_0_12px_rgba(27,78,140,0.15)] font-mono outline-none"
                            style={{ borderRadius: '6px' }}
                          />
                        ) : (
                          <div className="bg-[var(--bg-elevated)] border border-[var(--border)] px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)]" style={{ borderRadius: '6px' }}>
                            {user?.last_name || "Not Configured"}
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)]/80">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            setErrorMsg("");
                            if (user) {
                              setFormData({
                                name: user.name || "",
                                first_name: user.first_name || "",
                                last_name: user.last_name || "",
                                phone_number: user.phone_number || "",
                              });
                            }
                          }}
                          className="flex items-center gap-1 px-4 py-2 border border-[var(--border)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer font-mono"
                          style={{ borderRadius: '6px' }}
                        >
                          <X size={12} /> Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-5 py-2 border border-[var(--accent-blue)] hover:border-[var(--accent-blue)] bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white rounded font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-mono shadow-sm"
                          style={{ borderRadius: '6px' }}
                        >
                          {isSaving ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" /> Saving Registry...
                            </>
                          ) : (
                            <>
                              <Save size={12} /> Commit Changes
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Right Sidebar Status Cards */}
              <div className="space-y-6">
                {/* Secure Line Badge */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 shadow-xl relative" style={{ borderRadius: '12px' }}>
                  <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3 mb-4">
                    <Shield className="text-purple-500 dark:text-purple-400" size={15} />
                    <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest font-mono">Secure Node Status</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Direct Mail</span>
                      <span className="text-[var(--text-primary)] font-mono text-xs truncate max-w-[140px]" title={user?.email}>{user?.email || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-[var(--border)]/60 pt-3">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Connection</span>
                      <span className="text-emerald-500 dark:text-emerald-400 font-mono text-[10px] font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1 select-none">
                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping"></span> Secured TLS
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-[var(--border)]/60 pt-3">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Verification</span>
                      <span className="text-blue-500 dark:text-blue-400 font-mono text-[10px] font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider flex items-center gap-1 select-none">
                        <CheckCircle2 size={10} /> Active Agent
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit Information */}
                <div className="bg-[var(--bg-elevated)] border border-[var(--border)]/80 p-5 font-mono text-[10px] text-[var(--text-muted)] space-y-2 relative" style={{ borderRadius: '12px' }}>
                  <div className="absolute top-0 left-4 w-12 h-px bg-[var(--accent-blue)]/40"></div>
                  <p className="text-[var(--text-secondary)] font-bold uppercase text-[9px] tracking-wider mb-3">// SESSION AUDIT DICTIONARY</p>
                  <p>SYS_NODE: LOCAL-CLIENT-WS</p>
                  <p>IP_ROUTE: 127.0.0.1</p>
                  <p>INIT_PORT: 8000 (FASTAPI)</p>
                  <p>SYSTEM_TIME: {new Date().toISOString()}</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="gateway-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              {/* Access Key Auditing Card */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-6 shadow-xl relative" style={{ borderRadius: '12px' }}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-2xl pointer-events-none rounded-full"></div>
                
                <div className="flex items-center gap-2.5 border-b border-[var(--border)] pb-4 mb-5">
                  <Key className="text-purple-500 dark:text-purple-400" size={16} />
                  <h2 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest font-mono">Gateway API Authentication Key</h2>
                </div>
                
                <p className="text-[var(--text-muted)] text-xs mb-5 leading-relaxed font-mono">
                  This cryptographically secure credential allows external federated automation interfaces to interact with BreachSimu attack engines. Keep this token strictly confidential. All requests are logged in database history.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[var(--bg-input)] border border-[var(--border)]/80 p-4 rounded-xl mb-6" style={{ borderRadius: '8px' }}>
                  <span className="font-mono text-[var(--text-secondary)] font-bold tracking-wider select-all text-xs flex-1 break-all flex items-center min-h-8">
                    {showKey ? apiKey : "••••-••••-••••-••••-••••"}
                  </span>
                  
                  <div className="flex gap-2 justify-end sm:justify-start">
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="px-4 py-2 border border-[var(--border)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-all uppercase text-[10px] font-bold cursor-pointer font-mono shadow-sm active:scale-95"
                      style={{ borderRadius: '6px' }}
                    >
                      {showKey ? "Hide Token" : "Reveal"}
                    </button>
                    <button 
                      onClick={handleCopyToken}
                      className={`flex items-center gap-1 px-4 py-2 border transition-all uppercase text-[10px] font-bold cursor-pointer font-mono shadow-sm active:scale-95 ${
                        copied 
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" 
                          : "border-[var(--border)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                      style={{ borderRadius: '6px' }}
                    >
                      <Clipboard size={12} /> {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirmLogout}
        title="Sign Out?"
        message="You'll be returned to the login screen. Any unsaved progress may be lost."
        confirmText="Sign Out"
        cancelText="Stay"
        variant="danger"
        onConfirm={() => {
          setShowConfirmLogout(false);
          logout();
        }}
        onCancel={() => setShowConfirmLogout(false)}
      />
      
    </div>
  );
}
