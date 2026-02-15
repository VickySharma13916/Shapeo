'use client';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export interface ToolOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface ToolbarDropdownProps {
  options: ToolOption[];
  activeToolId: string;
  className?: string;
}

const ToolbarDropdown = ({ options, activeToolId, className = '' }: ToolbarDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTool = options.find(opt => opt.id === activeToolId) || options[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleToolClick = (option: ToolOption) => {
    option.action();
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-2 rounded-lg bg-zinc-700 text-white fluent-depth-8 fluent-glow-subtle fluent-smooth hover:bg-zinc-600 cursor-pointer"
        title={`${activeTool.label}${activeTool.shortcut ? ` (${activeTool.shortcut})` : ''}`}
      >
        {activeTool.icon}
        <ChevronDown size={12} className={`transition-transform fluent-smooth ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute -top-41 left-0 mt-2 min-w-50 fluent-acrylic border border-white/10 rounded-xl fluent-depth-32 overflow-hidden z-50 fluent-animate-in">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleToolClick(option)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left fluent-smooth cursor-pointer ${
                option.id === activeToolId
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-zinc-300 hover:bg-white/5 fluent-reveal'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={option.id === activeToolId ? 'text-blue-400' : 'text-zinc-400'}>
                  {option.icon}
                </div>
                <span className="text-sm font-medium">{option.label}</span>
              </div>
              {option.shortcut && (
                <span className="text-xs text-zinc-500 font-mono">{option.shortcut}</span>
              )}
              {option.id === activeToolId && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToolbarDropdown;
