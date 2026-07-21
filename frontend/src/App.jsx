import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Phishing from "./pages/Phishing";
import Login from "./pages/Login";
import Bruteforce from "./pages/Bruteforce";
import Sandbox from "./pages/Sandbox";
import Hardware from "./pages/Hardware";
import Ddos from "./pages/Ddos";
import Profile from "./pages/Profile";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { useContext, useState } from "react";
import { Menu, Building, LogOut, Sun, Moon, User } from "lucide-react";
import OrgLogin from "./pages/OrgLogin";
import OrgRegister from "./pages/OrgRegister";


const ProtectedRoute = ({ children }) => {
  const { user, loading, logout } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-transparent"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-slate-500"></div></div>;
  if (!user) return <Navigate to="/org-login" />;
  
  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F8] dark:bg-[#0B0F19] relative">
      {/* Fixed Header Wrapper */}
      <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
        {/* Top Identity Bar - Full Width */}
        <div className="w-full bg-[#1A2332] px-6 h-9 flex justify-between items-center text-[10px] tracking-wide font-sans select-none border-b border-slate-800">
          <div className="flex items-center gap-3 font-semibold text-slate-400">
            <span>COMMAND CONSOLE</span>
            <span className="text-slate-500 hidden md:block">// BREACH &amp; ATTACK SIMULATION</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">NODE-84 // SECURE</span>
            <span className="w-1.5 h-1.5 rounded-sm bg-emerald-400 animate-pulse"></span>
          </div>
        </div>

        {/* Mobile Header - Height set to h-14 to match desktop */}
        <div className="md:hidden flex items-center justify-between h-14 px-6 bg-[#1A2332] border-b border-slate-800 shadow-md">
          <img src="/logo.png" alt="RoBlockSec" className="h-8 object-contain" />
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme} 
              className={`relative overflow-hidden flex items-center justify-center w-8 h-8 rounded-lg border cursor-pointer transition-all duration-300 active:scale-90 ${
                isDark 
                  ? "bg-slate-900 border-purple-500/50 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.15)]" 
                  : "bg-slate-100 border-slate-300 text-slate-700 hover:text-amber-600 hover:border-amber-400 shadow-sm"
              }`}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              <div className="relative w-4.5 h-4.5 flex items-center justify-center transition-transform duration-500">
                {isDark ? <Moon size={14} className="animate-pulse" /> : <Sun size={14} className="animate-pulse" />}
              </div>
            </button>
            <Link 
              to="/profile"
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-[#2563EB] hover:border-[#2563EB] cursor-pointer transition-all duration-300 active:scale-90"
              title="Organization Profile"
            >
              <User size={14} />
            </Link>
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-300 hover:text-white transition-colors p-1">
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* Global Dashboard Header - Profile at Left Top */}
        <div className="hidden md:flex bg-white dark:bg-[#111827] dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 h-14 px-6 justify-between items-center shadow-none select-none">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="RoBlockSec" className="h-8 object-contain mr-2" />
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4 h-4">
              <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 tracking-wider uppercase">
                {user?.name || "RoBlockSec"}
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-[10px] font-semibold text-slate-500 tracking-widest uppercase">Live Session</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-400 font-medium tracking-wider hidden xl:block">NODE-84 &nbsp;|&nbsp; Secure Channel Active</span>
            
            {/* Theme toggle slider */}
            <button 
              onClick={toggleTheme}
              className={`relative w-14 h-7 rounded-full border transition-all duration-300 p-1 flex items-center cursor-pointer group overflow-hidden ${
                isDark 
                  ? "bg-slate-950 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.2)]" 
                  : "bg-slate-100 border-slate-300 shadow-inner"
              }`}
              title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 transform ${
                isDark 
                  ? 'translate-x-7 bg-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.7)]' 
                  : 'translate-x-0 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.7)]'
              }`}>
                {isDark ? <Moon size={12} style={{ color: '#ffffff' }} className="animate-pulse" /> : <Sun size={12} style={{ color: '#451a03' }} className="animate-pulse" />}
              </div>
            </button>

            {/* Profile settings shortcut */}
            <Link 
              to="/profile"
              className="flex items-center justify-center w-8 h-8 rounded-sm border border-slate-200 dark:border-slate-800 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue)] cursor-pointer transition-all duration-200"
              title="Organization Profile"
            >
              <User size={15} />
            </Link>

            {/* Menu fly-out button positioned on the right */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-sm border border-slate-200 dark:border-slate-800 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue)] cursor-pointer transition-all duration-200"
              title="Toggle Menu"
            >
              <Menu size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout offset by the fixed header height (36px identity bar + 56px header = 92px) */}
      <div className="flex flex-1 relative overflow-hidden" style={{ paddingTop: '92px' }}>
        <div className="flex-1 w-full flex flex-col transition-all duration-300 relative z-10" style={{ minHeight: 'calc(100vh - 92px)' }}>
          <div className="w-full flex-1 relative">
            {children}
          </div>
        </div>
        {/* Spacer to push content inline on desktop when sidebar is open */}
        {isSidebarOpen && (
          <div className="hidden md:block w-64 shrink-0 transition-all duration-300 ease-in-out" />
        )}
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/org-login" element={<OrgLogin />} />
          <Route path="/register" element={<OrgRegister />} />
          <Route path="/login" element={<Login />} />

          
          {/* Protected Layout */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Routes>
                <Route path="/dashboard" element={<Home />} />
                <Route path="/phishing" element={<Phishing />} />
                <Route path="/bruteforce" element={<Bruteforce />} />
                <Route path="/sandbox" element={<Sandbox />} />
                <Route path="/hardware" element={<Hardware />} />
                <Route path="/ddos" element={<Ddos />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </ProtectedRoute>

          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;