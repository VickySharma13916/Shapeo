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
  theme?: 'dark' | 'light';
  triggerIcon?: React.ReactNode;
  triggerTitle?: string;
  className?: string;
}

const ToolbarDropdown = ({
  options,
  activeToolId,
  theme = 'dark',
  triggerIcon,
  triggerTitle,
  className = '',
}: ToolbarDropdownProps) => {
  void theme;
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
        className="tb-button flex items-center gap-1 px-2.5 py-2 rounded-lg fluent-smooth cursor-pointer border tb-group"
        title={triggerTitle || `${activeTool.label}${activeTool.shortcut ? ` (${activeTool.shortcut})` : ''}`}
      >
        {triggerIcon || activeTool.icon}
        <ChevronDown size={12} className={`transition-transform fluent-smooth ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="tb-menu absolute bottom-full left-0 mb-2 min-w-50 rounded-xl overflow-hidden z-50 fluent-animate-in border">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleToolClick(option)}
              className={`tb-menu-item w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-semibold fluent-smooth cursor-pointer ${
                option.id === activeToolId ? 'bg-blue-600/20 text-blue-500' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={option.id === activeToolId ? 'text-blue-500' : 'tb-icon-dim'}>
                  {option.icon}
                </div>
                <span>{option.label}</span>
              </div>
              {option.shortcut && (
                <span className="text-[11px] font-mono tb-icon-dim">{option.shortcut}</span>
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
