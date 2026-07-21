import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Mail, Lock, CheckCircle, XCircle, Eye, EyeOff, Building2 } from "lucide-react";

export default function OrgRegister() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  // Password requirements checklist
  const [pwdRequirements, setPwdRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  useEffect(() => {
    setPwdRequirements({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      specialChar: /[@$!%*?&#_]/.test(password),
    });
  }, [password]);

  const isPasswordStrong = Object.values(pwdRequirements).every(Boolean);

  // Basic Email pattern validation
  const emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  const isEmailValid = emailPattern.test(email);

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }
    if (!isEmailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isPasswordStrong) {
      setError("Please ensure your password meets all strength criteria.");
      return;
    }

    try {
      await register(email, password, companyName.trim());
      setSuccessMsg("Registration successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/org-login");
      }, 2000);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg || JSON.stringify(d)).join(" | "));
      } else if (err.message) {
        setError(`Unable to connect to backend server (${err.message})`);
      } else {
        setError("Registration failed. Please check backend connection.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Visual background gradients */}
      <div className="absolute top-[-25%] right-[-15%] w-[60%] h-[60%] bg-purple-900/20 blur-[130px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-25%] left-[-15%] w-[60%] h-[60%] bg-blue-900/20 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="bg-[#0f172a] p-8 md:p-10 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md relative z-10 my-8">

        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-3 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <ShieldCheck className="text-purple-500 animate-pulse" size={28} />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Create Account</h2>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-mono font-bold">Secure Workspace Setup</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-xs rounded-xl text-center mb-5 animate-shake">
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs rounded-xl text-center mb-5">
            ✅ {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <Building2 size={12} className="text-purple-400" /> Company Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-3.5 bg-[#020617] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 text-sm transition-colors"
                placeholder="Acme Corp / Your Organization"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <Mail size={12} className="text-purple-400" /> Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-3.5 pr-10 bg-[#020617] border ${
                  email ? (isEmailValid ? "border-slate-700 focus:border-purple-500" : "border-red-500") : "border-slate-700"
                } rounded-xl text-white focus:outline-none text-sm transition-colors`}
                placeholder="name@organization.com"
              />
              {email && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  {isEmailValid ? (
                    <CheckCircle className="text-emerald-500" size={16} />
                  ) : (
                    <XCircle className="text-red-500" size={16} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5 relative">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} className="text-purple-400" /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 pr-12 bg-[#020617] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-purple-500 text-sm transition-colors"
                placeholder="••••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password strength checklist display */}
            {password && (
              <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] space-y-2 mt-2 shadow-sm">
                <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">Password Strength Checklist</p>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    {pwdRequirements.length ? <CheckCircle className="text-emerald-500 shrink-0" size={14} /> : <XCircle className="text-[var(--text-muted)] shrink-0" size={14} />}
                    <span className={pwdRequirements.length ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>8+ characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pwdRequirements.uppercase ? <CheckCircle className="text-emerald-500 shrink-0" size={14} /> : <XCircle className="text-[var(--text-muted)] shrink-0" size={14} />}
                    <span className={pwdRequirements.uppercase ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>One uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pwdRequirements.lowercase ? <CheckCircle className="text-emerald-500 shrink-0" size={14} /> : <XCircle className="text-[var(--text-muted)] shrink-0" size={14} />}
                    <span className={pwdRequirements.lowercase ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>One lowercase letter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pwdRequirements.number ? <CheckCircle className="text-emerald-500 shrink-0" size={14} /> : <XCircle className="text-[var(--text-muted)] shrink-0" size={14} />}
                    <span className={pwdRequirements.number ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>One digit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pwdRequirements.specialChar ? <CheckCircle className="text-emerald-500 shrink-0" size={14} /> : <XCircle className="text-[var(--text-muted)] shrink-0" size={14} />}
                    <span className={pwdRequirements.specialChar ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>One special char (@$!%*?&#_)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {(() => {
            const isFormValid = companyName.trim() && isEmailValid && isPasswordStrong;
            return (
              <button
                type="submit"
                disabled={!isFormValid}
                className={`w-full font-bold uppercase text-xs tracking-widest py-4 rounded-xl transition-all duration-300 mt-6 cursor-pointer border ${
                  isFormValid
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-transparent shadow-[0_4px_20px_rgba(168,85,247,0.25)] hover:shadow-[0_4px_30px_rgba(168,85,247,0.45)]"
                    : "bg-[var(--bg-elevated)] border-[var(--border)] cursor-not-allowed"
                }`}
                style={{ color: isFormValid ? "#ffffff" : "var(--text-muted)" }}
              >
                Register Account
              </button>
            );
          })()}
        </form>

        <p className="text-center text-slate-500 text-xs mt-6">
          Already registered? <Link to="/org-login" className="text-purple-400 hover:text-purple-300 font-semibold">Login here</Link>
        </p>
      </div>
    </div>
  );
}
