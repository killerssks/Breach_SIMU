import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, className = "", disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value)) || options[0];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 bg-[var(--bg-input)] rounded-lg border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-bright)] font-mono text-xs outline-none transition-all shadow-sm select-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-bright)] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((option) => {
            const isSelected = String(option.value) === String(value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange({ target: { value: option.value } });
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-mono transition-colors cursor-pointer select-none
                  ${isSelected ? 'bg-[var(--accent-dim)] text-[var(--accent-blue)] font-bold' : 'text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--accent-blue)]'}
                `}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check size={12} className="text-[var(--accent-blue)] shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
