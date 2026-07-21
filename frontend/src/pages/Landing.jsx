import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Crosshair, ServerCrash, Box, ChevronRight, Activity, Lock, Globe, Cpu, Layers, Database, Code, FileText, Users, Network, AlertCircle, TerminalSquare } from 'lucide-react';

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ color: 'var(--text-primary)' }} className="min-h-screen bg-[#020617] overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* 🟢 AMBIENT BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[150px] rounded-full mix-blend-screen" style={{ transform: `translateY(${scrollY * 0.2}px)` }}></div>
        <div className="absolute top-[30%] right-[-10%] w-[40%] h-[60%] bg-purple-900/20 blur-[150px] rounded-full mix-blend-screen" style={{ transform: `translateY(${scrollY * -0.1}px)` }}></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[40%] bg-emerald-900/10 blur-[150px] rounded-full mix-blend-screen" style={{ transform: `translateY(${scrollY * 0.15}px)` }}></div>
      </div>

      {/* 🟢 NAVIGATION */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="RoBlockSec" className="h-8 object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Capabilities</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#enterprise" className="hover:text-white transition-colors">Enterprise</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/org-login" className="text-sm font-bold text-slate-300 hover:text-white transition-colors px-4 py-2">Sign In</Link>
            <Link to="/register" className="text-sm font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all hover:-translate-y-0.5">
              Deploy
            </Link>
          </div>
        </div>
      </nav>

      {/* 🟢 HERO SECTION */}
      <section className="relative z-10 pt-48 pb-32 px-6 flex flex-col items-center text-center min-h-screen justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          Platform v2.0 Live
        </div>
        
        <h1 style={{ color: 'var(--text-primary)' }} className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1] mb-8 max-w-5xl">
          Offensive Security. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
            Automated & Scalable.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 font-medium leading-relaxed">
          The ultimate multi-tenant Breach & Attack Simulation platform. Execute live malware detonations, volumetric network stress tests, and automated phishing campaigns from a single unified Command Center.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-center">
          <Link to="/register" style={{ backgroundColor: 'var(--accent-blue)', color: '#ffffff', border: '1px solid var(--accent-blue)' }} className="w-full sm:w-auto px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 group shadow-[0_4px_12px_rgba(27,78,140,0.2)] hover:shadow-[0_4px_20px_rgba(27,78,140,0.4)]">
            Start Simulation <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/org-login" style={{ backgroundColor: 'transparent', borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)' }} className="w-full sm:w-auto px-8 py-4 border rounded-full font-black text-sm uppercase tracking-widest hover:bg-[var(--accent-dim)] transition-all flex items-center justify-center gap-3">
            Access Dashboard
          </Link>
        </div>

        {/* Hero Dashboard Preview (Realistic Operational Preview) */}
        <div className="mt-24 w-full max-w-5xl h-64 md:h-96 rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-md relative overflow-hidden shadow-2xl flex items-end justify-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          <div className="w-[92%] h-[88%] bg-[#060D18] rounded-t-2xl border-t border-x border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.7)] p-4 flex gap-4 select-none text-left font-sans">
             
             {/* Mock Sidebar */}
             <div className="w-1/4 h-full border-r border-white/5 pr-4 flex flex-col gap-2 shrink-0">
               <div className="flex items-center gap-1.5 pb-3 mb-2 border-b border-white/5">
                 <div className="w-3.5 h-3.5 rounded-sm bg-blue-500 flex items-center justify-center text-[7px] font-black text-white">R</div>
                 <span className="text-[9px] font-black tracking-widest text-white uppercase">RoBlockSec</span>
               </div>
               
               <div className="flex items-center gap-2 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded text-[8px] font-bold">
                 <Shield size={10} /> Dashboard Command
               </div>
               <div className="flex items-center gap-2 px-2 py-1.5 text-slate-500 hover:text-slate-300 rounded text-[8px] font-medium transition-colors">
                 <Crosshair size={10} /> Phishing Campaign
               </div>
               <div className="flex items-center gap-2 px-2 py-1.5 text-slate-500 hover:text-slate-300 rounded text-[8px] font-medium transition-colors">
                 <AlertCircle size={10} /> Bruteforce Simulator
               </div>
               <div className="flex items-center gap-2 px-2 py-1.5 text-slate-500 hover:text-slate-300 rounded text-[8px] font-medium transition-colors">
                 <Box size={10} /> Malware Sandbox
               </div>
               <div className="flex items-center gap-2 px-2 py-1.5 text-slate-500 hover:text-slate-300 rounded text-[8px] font-medium transition-colors">
                 <ServerCrash size={10} /> Stressor Attack
               </div>
               
               <div className="mt-auto pt-3 border-t border-white/5 text-[7px] text-slate-600 font-mono">
                 NODE-84 // SECURE
               </div>
             </div>
             
             {/* Mock Main Panel */}
             <div className="flex-1 flex flex-col gap-4">
               {/* Stats Row */}
               <div className="flex gap-4">
                 <div className="p-3 flex-1 bg-white/5 rounded-xl border border-white/5 border-l-2 border-l-blue-500 flex flex-col justify-between">
                   <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Active Tasks</span>
                   <span className="text-sm font-black text-white tracking-tight mt-1">04 CAMPAIGNS</span>
                 </div>
                 <div className="p-3 flex-1 bg-white/5 rounded-xl border border-white/5 border-l-2 border-l-emerald-500 flex flex-col justify-between">
                   <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Intercepted events</span>
                   <span className="text-sm font-black text-white tracking-tight mt-1">14,842 SEC_LOGS</span>
                 </div>
                 <div className="p-3 flex-1 bg-white/5 rounded-xl border border-white/5 border-l-2 border-l-purple-500 flex flex-col justify-between">
                   <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Network Health</span>
                   <span className="text-sm font-black text-white tracking-tight mt-1">98% STABLE</span>
                 </div>
               </div>
               
               {/* Terminal Output */}
               <div className="flex-1 bg-[#030712] border border-white/5 rounded-xl p-3 font-mono text-[8px] flex flex-col gap-1 overflow-hidden relative">
                  <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5 mb-1.5 text-slate-500 uppercase tracking-wider text-[7px]">
                    <TerminalSquare size={10} /> Live System Intercept Logs
                  </div>
                  <div className="text-blue-400 font-semibold">[05:44:12] [SYSTEM] INITIATING PROBE SEQUENCE...</div>
                  <div className="text-amber-400">[05:44:13] [PORT_SCAN] AUTONOMOUS DISCOVERY SWEEP ACTIVE ON SUBNET 192.168.1.0/24</div>
                  <div className="text-purple-400">[05:44:15] [MALWARE] UPLOAD RECEIVED: ransomware_v4.bin (DETONATING...)</div>
                  <div className="text-red-400">[05:44:18] [STRESSOR] 1.2M PKTS/SEC FLUID TRANSMISSION ON VECTOR: SYN_FLOOD</div>
                  <div className="text-emerald-400 font-bold">[05:44:20] [SUCCESS] TARGET INFRASTRUCTURE RESPONDING TO RETRY DIAGNOSTICS</div>
                  <div className="text-blue-400 animate-pulse font-bold mt-0.5">█ RUNNING DIAGNOSTIC PROBES...</div>
               </div>
             </div>

          </div>
        </div>
      </section>

      {/* 🟢 FEATURES GRID */}
      <section id="features" className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">Military-Grade Testing Vectors</h2>
          <p className="text-slate-400 max-w-2xl mx-auto font-medium">Uncover vulnerabilities before threat actors do by safely simulating advanced persistent threats across all organizational layers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all group backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Box size={100}/></div>
            <div className="w-14 h-14 bg-purple-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform">
              <Box size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Live Malware Sandbox</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Upload suspected binaries to our isolated hypervisors. We automatically extract static strings, monitor dynamic OS behavior, and generate forensic PDFs.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all group backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><ServerCrash size={100}/></div>
            <div className="w-14 h-14 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center mb-6 text-red-400 group-hover:scale-110 transition-transform">
              <ServerCrash size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Network Stressor (DDoS)</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Launch highly configurable SYN, UDP, and HTTP volumetric floods against authorized infrastructure to validate your Web Application Firewalls.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all group backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Crosshair size={100}/></div>
            <div className="w-14 h-14 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform">
              <Crosshair size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Automated Phishing</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Deploy hyper-realistic social engineering campaigns. Track email open rates, malicious link clicks, and compromised credentials in real time.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all group backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Shield size={100}/></div>
            <div className="w-14 h-14 bg-orange-500/20 border border-orange-500/30 rounded-2xl flex items-center justify-center mb-6 text-orange-400 group-hover:scale-110 transition-transform">
              <Shield size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Bruteforce & Network Scanning</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Autonomously discover vulnerable hosts via ICMP sweeping and execute aggressive dictionary attacks against SSH and FTP services.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all group backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Lock size={100}/></div>
            <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
              <Lock size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Multi-Tenant Architecture</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Strict cryptographic data isolation. MSSPs can manage hundreds of client organizations simultaneously without cross-tenant data leakage.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all group backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={100}/></div>
            <div className="w-14 h-14 bg-cyan-500/20 border border-cyan-500/30 rounded-2xl flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 transition-transform">
              <Activity size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Live Global Intelligence</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              A unified Command Center dashboard featuring live WebSocket streams, dynamically calculating your organization's real-time security posture score.
            </p>
          </div>
        </div>
      </section>

      {/* 🟢 ARCHITECTURE SECTION */}
      <section id="architecture" className="relative z-10 py-32 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="flex-1">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">Built for High-Performance Telemetry</h2>
            <p className="text-slate-400 font-medium leading-relaxed mb-8 text-lg">
              RoBlockSec's architecture is engineered to handle thousands of concurrent WebSocket events without dropping a single packet. Our asynchronous backend ensures your dashboard stays perfectly synced with the attack engines.
            </p>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-blue-400 mt-1"><Code size={20}/></div>
                <div>
                  <h4 style={{ color: 'var(--text-primary)' }} className="font-bold text-lg mb-1">FastAPI & AsyncIO Backend</h4>
                  <p className="text-slate-500 text-sm">Non-blocking API routes combined with Python's BackgroundTasks allow massive volumetric DDoS floods and Malware analysis to run entirely asynchronously.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-400 mt-1"><Network size={20}/></div>
                <div>
                  <h4 style={{ color: 'var(--text-primary)' }} className="font-bold text-lg mb-1">Bi-Directional WebSockets</h4>
                  <p className="text-slate-500 text-sm">A centralized Connection Manager broadcasts live forensic logs, packet counts, and status changes instantly to the React frontend.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20 text-purple-400 mt-1"><Database size={20}/></div>
                <div>
                  <h4 style={{ color: 'var(--text-primary)' }} className="font-bold text-lg mb-1">Cryptographic Persistence</h4>
                  <p className="text-slate-500 text-sm">Passwords, credentials, and API keys are securely hashed using bcrypt before ever touching the SQLAlchemy database layer.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full max-w-lg relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
            <div className="relative bg-[#0a0f1c] border border-white/10 rounded-[2rem] p-8 shadow-2xl backdrop-blur-xl">
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3 hover:bg-white/10 transition-colors">
                    <Layers className="text-blue-400" size={32} />
                    <span className="font-bold text-sm">React 18</span>
                 </div>
                 <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3 hover:bg-white/10 transition-colors">
                    <Zap className="text-emerald-400" size={32} />
                    <span className="font-bold text-sm">FastAPI</span>
                 </div>
                 <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3 hover:bg-white/10 transition-colors">
                    <Box className="text-purple-400" size={32} />
                    <span className="font-bold text-sm">Hypervisors</span>
                 </div>
                 <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3 hover:bg-white/10 transition-colors">
                    <Database className="text-orange-400" size={32} />
                    <span className="font-bold text-sm">SQLAlchemy</span>
                 </div>
               </div>
               
               {/* Animated Connection Lines */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/10 bg-[#020617] flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] z-10">
                 <Activity className="text-white animate-pulse" size={24} />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🟢 ENTERPRISE SECTION */}
      <section id="enterprise" className="relative z-10 py-32 px-6 bg-gradient-to-b from-transparent to-[#050b14] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-widest mb-6">
                <Shield size={14} /> Built for MSSPs
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight max-w-2xl">Manage multiple clients with Absolute Isolation.</h2>
            </div>
            <Link to="/register" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-bold text-sm transition-colors flex items-center gap-2">
              View Licensing <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-[#020617] border border-white/10 p-8 rounded-3xl">
                <Users className="text-blue-400 mb-6" size={36} />
                <h3 className="text-xl font-bold mb-3">Multi-Tenant Workspaces</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Register as an MSSP and spin up entirely separate workspaces for each client. Phishing campaigns, sandbox logs, and DDoS targets are cryptographically walled off per tenant.
                </p>
             </div>
             
             <div className="bg-[#020617] border border-white/10 p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full group-hover:bg-purple-500/20 transition-colors"></div>
                <FileText className="text-purple-400 mb-6 relative z-10" size={36} />
                <h3 className="text-xl font-bold mb-3 relative z-10">Automated PDF Reporting</h3>
                <p className="text-slate-400 text-sm leading-relaxed relative z-10">
                  Generate executive summaries and highly technical forensic reports instantly. Brand the PDFs with your own MSSP logo and deliver them directly to stakeholders.
                </p>
             </div>
             
             <div className="bg-[#020617] border border-white/10 p-8 rounded-3xl">
                <Lock className="text-emerald-400 mb-6" size={36} />
                <h3 className="text-xl font-bold mb-3">Role-Based Access Control</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Assign fine-grained permissions. Allow "Auditor" accounts to view Security Scores and dashboards without the ability to initiate active DDoS or Malware Sandbox detonations.
                </p>
             </div>
          </div>
        </div>
      </section>

      {/* 🟢 CTA SECTION */}
      <section className="relative z-10 py-32 border-t border-white/10 bg-gradient-to-b from-transparent to-blue-950/20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-8">Ready to stress-test your defenses?</h2>
          <p className="text-slate-400 mb-12 text-lg">Join elite security teams using RoBlockSec to identify and patch vulnerabilities proactively.</p>
          <Link to="/register" className="inline-flex px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_rgba(37,99,235,0.6)] transition-all hover:-translate-y-1">
            Initialize Workspace
          </Link>
        </div>
      </section>

      {/* 🟢 FOOTER */}
      <footer className="relative z-10 border-t border-white/10 bg-[#020617] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="RoBlockSec" className="h-6 object-contain opacity-80" />
          </div>
          <p className="text-sm text-slate-600 font-medium">© 2026 RoBlockSec Technologies. Authorized educational and professional use only.</p>
        </div>
      </footer>
    </div>
  );
}
