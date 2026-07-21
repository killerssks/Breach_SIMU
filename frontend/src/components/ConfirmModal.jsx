import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, X, Terminal } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
}) {
  const cancelRef = useRef(null);

  /* Focus the cancel button when modal opens */
  useEffect(() => {
    if (isOpen) cancelRef.current?.focus();
  }, [isOpen]);

  /* Close on Escape key */
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel?.(); };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      accentText: "text-red-400",
      accentBg: "bg-red-500/5",
      headerText: "SYSTEM WARNING // REVOCATION",
      themeColor: "#f87171",
      glowColor: "rgba(239, 68, 68, 0.1)",
    },
    warning: {
      accentText: "text-amber-400",
      accentBg: "bg-amber-500/5",
      headerText: "SYSTEM ALERT // CONFIRMATION",
      themeColor: "#fbbf24",
      glowColor: "rgba(245, 158, 11, 0.1)",
    },
    info: {
      accentText: "text-blue-400",
      accentBg: "bg-blue-500/5",
      headerText: "SYSTEM INFO // INQUIRY",
      themeColor: "#60a5fa",
      glowColor: "rgba(59, 130, 246, 0.1)",
    },
  };

  const s = variantStyles[variant] ?? variantStyles.danger;

  return createPortal(
    /* Backdrop */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onCancel}
      style={{ backgroundColor: "rgba(3, 7, 18, 0.75)", backdropFilter: "blur(8px)" }}
    >
      {/* Modal Card */}
      <div
        className="relative w-full max-w-md rounded-lg border overflow-hidden shadow-2xl"
        style={{
          background: "#080C14",
          borderColor: "rgba(255, 255, 255, 0.08)",
          boxShadow: `0 0 30px ${s.glowColor}, 0 10px 40px rgba(0,0,0,0.6)`,
          animation: "confirmModalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Futuristic Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none"></div>

        {/* Scan line effect */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20 animate-[scanline_3s_linear_infinite] pointer-events-none opacity-40"></div>

        {/* Modal Top Cyber Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b select-none"
          style={{ backgroundColor: "#0c1220", borderBottomColor: "rgba(255, 255, 255, 0.06)" }}
        >
          <div className="flex items-center gap-2">
            <Terminal size={12} style={{ color: s.themeColor }} />
            <span className="text-[9px] font-bold font-mono tracking-widest uppercase" style={{ color: "#64748b" }}>
              {s.headerText}
            </span>
          </div>
          <button
            onClick={onCancel}
            className="transition-colors cursor-pointer p-0.5"
            style={{ color: "#64748b" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#ffffff"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#64748b"}
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 relative z-10">
          <div className="flex items-start gap-4">
            {/* Animated Cyber Shield Warning Indicator */}
            <div className={`p-3 rounded-lg border border-white/5 ${s.accentBg} shrink-0`}>
              <ShieldAlert style={{ color: s.themeColor }} className="animate-pulse" size={24} />
            </div>

            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-bold font-mono tracking-wide uppercase" style={{ color: "#ffffff" }}>
                {title}
              </h3>
              <p className="text-xs font-mono leading-relaxed" style={{ color: "#94a3b8" }}>
                {message}
              </p>
            </div>
          </div>

          {/* Tactical Metadata Display */}
          <div 
            className="mt-5 p-3 rounded border font-mono text-[9px] space-y-1.5 select-none" 
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", borderColor: "rgba(255, 255, 255, 0.05)" }}
          >
            <div className="flex justify-between" style={{ color: "#64748b" }}>
              <span>NODE DETECTED:</span>
              <span style={{ color: "#cbd5e1" }}>NODE-84</span>
            </div>
            <div className="flex justify-between" style={{ color: "#64748b" }}>
              <span>ACTION ROUTE:</span>
              <span style={{ color: "#cbd5e1" }}>AUTHENTICATOR_SIGN_OUT</span>
            </div>
            <div className="flex justify-between" style={{ color: "#64748b" }}>
              <span>SESSION STATE:</span>
              <span style={{ color: "#ef4444" }} className="font-bold">TERMINATING</span>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex gap-3 justify-end mt-6 font-mono">
            {/* Stay / Cancel */}
            <button
              ref={cancelRef}
              onClick={onCancel}
              className="px-4 py-2.5 rounded border text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                borderColor: "#334155",
                color: "#cbd5e1",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.8)";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.6)";
                e.currentTarget.style.color = "#cbd5e1";
              }}
            >
              [ {cancelText} ]
            </button>

            {/* Confirm */}
            <button
              onClick={onConfirm}
              className="px-5 py-2.5 rounded text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor: variant === "danger" ? "rgba(239, 68, 68, 0.15)" : variant === "warning" ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)",
                borderColor: variant === "danger" ? "rgba(239, 68, 68, 0.4)" : variant === "warning" ? "rgba(245, 158, 11, 0.4)" : "rgba(59, 130, 246, 0.4)",
                color: s.themeColor,
                boxShadow: `0 0 10px ${s.glowColor}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = variant === "danger" ? "#ef4444" : variant === "warning" ? "#f59e0b" : "#3b82f6";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.borderColor = variant === "danger" ? "#ef4444" : variant === "warning" ? "#f59e0b" : "#3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = variant === "danger" ? "rgba(239, 68, 68, 0.15)" : variant === "warning" ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)";
                e.currentTarget.style.color = s.themeColor;
                e.currentTarget.style.borderColor = variant === "danger" ? "rgba(239, 68, 68, 0.4)" : variant === "warning" ? "rgba(245, 158, 11, 0.4)" : "rgba(59, 130, 246, 0.4)";
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>

        {/* Accent indicator corner lines */}
        <div 
          className="absolute bottom-0 left-0 w-2 h-2 border-l border-b"
          style={{ borderColor: s.themeColor }}
        ></div>
        <div 
          className="absolute bottom-0 right-0 w-2 h-2 border-r border-b"
          style={{ borderColor: s.themeColor }}
        ></div>
      </div>

      {/* Style sheets */}
      <style>{`
        @keyframes confirmModalIn {
          0% { opacity: 0; transform: scale(0.97) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes scanline {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </div>,
    document.body
  );
}
