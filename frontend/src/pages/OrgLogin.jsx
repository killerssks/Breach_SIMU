import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Mail, Lock } from "lucide-react";

export default function OrgLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="bg-[#0f172a] p-10 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <ShieldCheck className="text-blue-500" size={32} />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Organization Login</h2>
          <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest font-mono">RoBlockSec</p>
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Mail size={12} /> Email Address
            </label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-[#020617] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="admin@organization.com" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} /> Password
            </label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-[#020617] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••••••" />
          </div>
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold uppercase text-xs tracking-widest py-4 rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.25)] hover:shadow-[0_4px_30px_rgba(59,130,246,0.45)] transition-all mt-4 cursor-pointer"
            style={{ color: "#ffffff" }}
          >
            Sign In
          </button>
        </form>
        <p className="text-center text-slate-500 text-xs mt-6">
          Don't have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300">Register here</Link>
        </p>
      </div>
    </div>
  );
}
