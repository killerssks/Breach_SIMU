import { Link, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useSecurity } from "../context/SecurityContext";
import { LayoutDashboard, LogOut, X, ServerCrash, Crosshair, AlertCircle, Box, Cpu, User } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const { sandboxData, scannerData, ddosData } = useSecurity();
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const navItems = [
    { name: "Command Center", path: "/dashboard", icon: LayoutDashboard },
    { name: "Phishing", path: "/phishing", icon: Crosshair },
    { name: "Bruteforce", path: "/bruteforce", icon: AlertCircle, activeStatus: scannerData.isAttacking, statusColor: "text-orange-300 bg-orange-500/15" },
    { name: "Malware Sandbox", path: "/sandbox", icon: Box, activeStatus: sandboxData.isRunning, statusColor: "text-purple-300 bg-purple-500/15" },
    { name: "Hardware Lab", path: "/hardware", icon: Cpu },
    { name: "Network Stressor", path: "/ddos", icon: ServerCrash, activeStatus: ddosData.isRunning, statusColor: "text-red-300 bg-red-500/15" },
    { name: "Profile Settings", path: "/profile", icon: User }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 top-[92px] bg-black/60 z-40 backdrop-blur-xs transition-opacity md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar Container ── right side */}
      <div className={`w-64 bg-[#1A2332] text-slate-300 h-[calc(100vh-92px)] fixed top-[92px] right-0 z-50 border-l border-[#253040] flex flex-col transform transition-all duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>

        {/* Navigation Section Label */}
        <div className="px-5 pt-5 pb-2">
          <span className="text-[9px] font-semibold text-slate-600 uppercase tracking-[0.15em]">
            Attack Modules
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-px flex-1 px-3 overflow-y-auto">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={index}
                to={item.path}
                className={`relative flex items-center gap-3 px-3 py-2.5 transition-all duration-150 group text-[13px] sidebar-link ${isActive ? "active" : ""}`}
              >
                <Icon size={14} className="transition-colors shrink-0" />
                <span>{item.name}</span>

                {/* Live Badge */}
                {item.activeStatus && (
                  <span className={`ml-auto text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 animate-pulse rounded-sm ${item.statusColor}`}>
                    LIVE
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer - Sign Out */}
        <div className="mt-auto border-t border-[#253040] p-4">
          <button
            onClick={() => setShowSignOutModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2 bg-slate-900/30 border border-slate-700/30 hover:border-red-500 hover:bg-red-500/10 text-slate-400 hover:text-red-500 text-[13px] font-semibold transition-all cursor-pointer rounded-sm"
          >
            <LogOut size={14} className="shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Fancy Sign Out Confirmation Modal */}
      <ConfirmModal
        isOpen={showSignOutModal}
        title="Sign Out?"
        message="You'll be returned to the login screen. Any unsaved progress may be lost."
        confirmText="Sign Out"
        cancelText="Stay"
        variant="danger"
        onConfirm={() => { setShowSignOutModal(false); logout(); }}
        onCancel={() => setShowSignOutModal(false)}
      />
    </>
  );
}