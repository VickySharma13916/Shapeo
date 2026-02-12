import React from 'react';
import { 
  ChevronDown, Download, ZoomIn, ZoomOut, PanelRight, Target, Droplet, Square, Home, RotateCw, 
  ChevronsUp, ChevronUp, ChevronDown as ChevronDownIcon, ChevronsDown,
  AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Link, Unlink, Box
} from 'lucide-react';

import { useStore } from '../store/useStore';

import { exportSelectionToPNG } from '../engine/export';
import type { Shape } from '../engine/types';

const SidebarSection = ({ title, children, icon }: { title: string, children: React.ReactNode, icon?: React.ReactNode }) => (
  <div className="border-b border-zinc-700/40 pb-4 mb-4 last:border-0">
    <div className="flex items-center justify-between mb-3.5 px-0.5">
      <span className="text-[11px] font-bold text-white/90 uppercase tracking-wider">{title}</span>
      {icon || <ChevronDown size={12} className="text-zinc-600" />}
    </div>
    {children}
  </div>
);

export default function PropertySidebar() {
  const { 
    pages, currentPageId, selectedIds, updateShape, saveHistory, camera, setCamera, 
    zoomIn, zoomOut, centerObject, rightSidebarVisible, toggleRightSidebar, 
    bringToFront, sendToBack, moveForward, moveBackward, alignLeft, alignCenter, 
    alignRight, alignTop, alignMiddle, alignBottom, toggleAspectRatioLock
  } = useStore();

  const currentPage = pages.find(p => p.id === currentPageId);
  const shapes = currentPage?.shapes || [];
  const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
  const firstShape = selectedShapes[0];

  // Local state for smooth input editing
  const [localValues, setLocalValues] = React.useState<Record<string, number>>({});
  
  // State for numeric scrubbing
  const [scrubbingKey, setScrubbingKey] = React.useState<string | null>(null);
  const [scrubStartX, setScrubStartX] = React.useState(0);
  const [scrubStartValue, setScrubStartValue] = React.useState(0);

  const handleBulkUpdate = React.useCallback((updates: Partial<Shape>, commitNow = false) => {
    selectedIds.forEach(id => updateShape(id, updates));
    if (commitNow) saveHistory();
  }, [selectedIds, updateShape, saveHistory]);
  
  const handleCommit = React.useCallback(() => {
    saveHistory();
  }, [saveHistory]);
  
  // Numeric scrubbing handlers
  const handleLabelMouseDown = (e: React.MouseEvent, key: string, value: number) => {
    e.preventDefault();
    setScrubbingKey(key);
    setScrubStartX(e.clientX);
    setScrubStartValue(value);
  };

  const handleLabelMouseMove = React.useCallback((e: MouseEvent) => {
    if (!scrubbingKey) return;
    
    const deltaX = e.clientX - scrubStartX;
    const step = e.shiftKey ? 10 : 1;
    const change = Math.round(deltaX / 2) * step;
    const newValue = Math.max(0, scrubStartValue + change);
    
    handleBulkUpdate({ [scrubbingKey]: newValue });
  }, [scrubbingKey, scrubStartX, scrubStartValue, handleBulkUpdate]);

  const handleLabelMouseUp = React.useCallback(() => {
    if (scrubbingKey) {
      handleCommit();
      setScrubbingKey(null);
    }
  }, [scrubbingKey, handleCommit]);

  // Manage cursor style via useEffect
  React.useEffect(() => {
    if (scrubbingKey) {
      document.body.style.cursor = 'ew-resize';
      return () => {
        document.body.style.cursor = 'default';
      };
    }
  }, [scrubbingKey]);

  // Global event listeners for scrubbing
  React.useEffect(() => {
    if (scrubbingKey) {
      window.addEventListener('mousemove', handleLabelMouseMove);
      window.addEventListener('mouseup', handleLabelMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleLabelMouseMove);
        window.removeEventListener('mouseup', handleLabelMouseUp);
      };
    }
  }, [scrubbingKey, handleLabelMouseMove, handleLabelMouseUp]);
  
  // Added Figma-style reset view
  const resetView = () => setCamera({ x: 0, y: 0, zoom: 1 });

  const renderNavigator = () => (
    <SidebarSection 
      title="Navigator" 
      icon={<span className="text-white text-[10px] font-mono">{Math.round(camera.zoom * 100)}%</span>}
    >
      <div className="grid grid-cols-5 gap-1">
        <button onClick={zoomIn} className="p-2.5 cursor-pointer flex justify-center bg-zinc-800/40 hover:bg-zinc-700 rounded text-white fluent-smooth fluent-reveal" title="Zoom In"><ZoomIn size={14} /></button>
        <button onClick={zoomOut} className="p-2.5 cursor-pointer flex justify-center bg-zinc-800/40 hover:bg-zinc-700 rounded text-white fluent-smooth fluent-reveal" title="Zoom Out"><ZoomOut size={14} /></button>
        <button onClick={resetView} className="p-2.5 cursor-pointer flex justify-center bg-zinc-800/40 hover:bg-zinc-700 rounded text-white fluent-smooth fluent-reveal" title="Reset View"><Home size={14} /></button>
        <button 
          onClick={() => selectedIds.length > 0 && centerObject(selectedIds[0])} 
          disabled={selectedIds.length === 0}
          className={`p-2.5 flex justify-center cursor-pointer rounded fluent-smooth ${selectedIds.length > 0 ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white fluent-reveal' : 'bg-zinc-800/20 text-zinc-700 cursor-not-allowed'}`}
          title="Focus Selection"
        ><Target size={14} /></button>
        {/* <button onClick={toggleGrid} className="p-2.5 cursor-pointer flex justify-center bg-zinc-800/40 hover:bg-zinc-700 rounded text-white transition-colors" title="Toggle Grid"><Grid3x3 size={14} /></button> */}
      </div>
    </SidebarSection>
  );

  if (!rightSidebarVisible) {
    return (
      <div className="fixed top-4 right-4 w-64 h-auto fluent-acrylic border border-white/10 rounded-lg z-50 p-3 fluent-depth-16">
        {renderNavigator()}
        <button 
          onClick={toggleRightSidebar}
          className="w-full mt-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold fluent-smooth flex items-center justify-center gap-2 fluent-reveal"
        >
          <PanelRight size={14} />
          Show Properties
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 w-64 h-[calc(100%-30px)] rounded-lg fluent-acrylic border border-white/10 overflow-y-auto z-50 p-4 select-none fluent-depth-16 flex flex-col fluent-scrollbar">
      <div className="flex justify-between items-center mb-4 px-0.5">
        <span className="text-white text-xs font-bold uppercase tracking-widest opacity-70">Inspector</span>
        <button onClick={toggleRightSidebar} className="text-blue-400 hover:text-white cursor-pointer fluent-smooth fluent-reveal">
          <PanelRight size={16} />
        </button>
      </div>

      {/* 1. NAVIGATOR */}
      {renderNavigator()}

      {!firstShape ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-20">
          <div className="w-12 h-12 border-2 border-dashed border-zinc-700 rounded-lg mb-2" />
          <span className="text-[10px] text-white uppercase font-bold tracking-widest">No Selection</span>
        </div>
      ) : (
        <>
          {/* 2. LAYER (Z-INDEX CONTROLS) */}
          <SidebarSection title="Layer">
            <div className="grid grid-cols-4 gap-2">
              <button 
                onClick={moveForward}
                className="flex flex-col items-center justify-center bg-zinc-800/40 px-2 py-2.5 rounded-md border border-zinc-700/50 hover:border-blue-500 hover:bg-zinc-800/60 fluent-smooth fluent-reveal cursor-pointer"
                title="Move forward one layer"
              >
                <ChevronUp size={16} className="text-zinc-400" />
                <span className="text-[9px] text-zinc-500 mt-0.5 font-semibold">+1</span>
              </button>
              <button 
                onClick={bringToFront}
                className="flex flex-col items-center justify-center bg-zinc-800/40 px-2 py-2.5 rounded-md border border-zinc-700/50 hover:border-blue-500 hover:bg-zinc-800/60 fluent-smooth fluent-reveal cursor-pointer"
                title="Bring to front"
              >
                <ChevronsUp size={16} className="text-zinc-400" />
                <span className="text-[9px] text-zinc-500 mt-0.5 font-semibold">Front</span>
              </button>
              <button 
                onClick={sendToBack}
                className="flex flex-col items-center justify-center bg-zinc-800/40 px-2 py-2.5 rounded-md border border-zinc-700/50 hover:border-blue-500 hover:bg-zinc-800/60 fluent-smooth fluent-reveal cursor-pointer"
                title="Send to back"
              >
                <ChevronsDown size={16} className="text-zinc-400" />
                <span className="text-[9px] text-zinc-500 mt-0.5 font-semibold">Back</span>
              </button>
              <button 
                onClick={moveBackward}
                className="flex flex-col items-center justify-center bg-zinc-800/40 px-2 py-2.5 rounded-md border border-zinc-700/50 hover:border-blue-500 hover:bg-zinc-800/60 fluent-smooth fluent-reveal cursor-pointer"
                title="Move backward one layer"
              >
                <ChevronDownIcon size={16} className="text-zinc-400" />
                <span className="text-[9px] text-zinc-500 mt-0.5 font-semibold">-1</span>
              </button>
            </div>
          </SidebarSection>

          {/* 3. ALIGNMENT (MULTI-SELECT ONLY) */}
          {selectedIds.length >= 2 && (
            <SidebarSection title="Align">
              <div className="space-y-2">
                {/* Horizontal Alignment */}
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={alignLeft}
                    className="flex flex-col items-center justify-center bg-zinc-800/40 px-2 py-2.5 rounded-md border border-zinc-700/50 hover:border-blue-500 hover:bg-zinc-800/60 fluent-smooth fluent-reveal cursor-pointer"
                    title="Align left edges"
                  >
                    <AlignLeft size={16} className="text-zinc-400" />
                    <span className="text-[9px] text-zinc-500 mt-0.5 font-semibold">Left</span>
                  </button>
                  <button 
                    onClick={alignCenter}
                    className="flex flex-col items-center justify-center bg-zinc-800/40 px-2 py-2.5 rounded-md border border-zinc-700/50 hover:border-blue-500 hover:bg-zinc-800/60 fluent-smooth fluent-reveal cursor-pointer"
                    title="Align horizontal centers"
                  >
                    <AlignCenter size={16} className="text-zinc-400" />
                    <span className="text-[9px] text-zinc-500 mt-0.5 font-semibold">Center</span>
                  </button>
                  <button 
                    onClick={alignRight}
                    className="flex flex-col items-center justify-center bg-zinc-800/40 px-2 py-2.5 rounded-md border border-zinc-700/50 hover:border-blue-500 hover:bg-zinc-800/60 fluent-smooth fluent-reveal cursor-pointer"
                    title="Align right edges"
                  >
                    <AlignRight size={16} className="text-zinc-400" />
                    <span className="text-[9px] text-zinc-500 mt-0.5 font-semibold">Right</span>
                  </button>
                </div>
                {/* Vertical Alignment */}
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={alignTop}
                    className="flex flex-col items-center justify-center bg-zinc-800/40 px-2 py-2.5 rounded-md border border-zinc-700/50 hover:border-blue-500 hover:bg-zinc-800/60 fluent-smooth fluent-reveal cursor-pointer"
                    title="Align top edges"
                  >
                    <AlignStartVertical size={16} className="text-zinc-400" />
                    <span className="text-[9px] text-zinc-500 mt-0.5 font-semibold">Top</span>
                  </button>
                  <button 
                    onClick={alignMiddle}
                    className="flex flex-col items-center justify-center bg-zinc-800/40 px-2 py-2.5 rounded-md border border-zinc-700/50 hover:border-blue-500 hover:bg-zinc-800/60 fluent-smooth fluent-reveal cursor-pointer"
                    title="Align vertical centers"
                  >
                    <AlignCenterVertical size={16} className="text-zinc-400" />
                    <span className="text-[9px] text-zinc-500 mt-0.5 font-semibold">Middle</span>
                  </button>
                  <button 
                    onClick={alignBottom}
                    className="flex flex-col items-center justify-center bg-zinc-800/40 px-2 py-2.5 rounded-md border border-zinc-700/50 hover:border-blue-500 hover:bg-zinc-800/60 fluent-smooth fluent-reveal cursor-pointer"
                    title="Align bottom edges"
                  >
                    <AlignEndVertical size={16} className="text-zinc-400" />
                    <span className="text-[9px] text-zinc-500 mt-0.5 font-semibold">Bottom</span>
                  </button>
                </div>
              </div>
            </SidebarSection>
          )}

          {/* 3. TRANSFORMATION */}
          <SidebarSection title="Transform">
            <div className="space-y-2">
              {/* X and Y - First Row */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'X', value: firstShape.x, key: 'x' },
                  { label: 'Y', value: firstShape.y, key: 'y' },
                ].map((prop) => {
                  const displayValue = localValues[prop.key] !== undefined ? localValues[prop.key] : Math.round(prop.value);
                  return (
                    <div key={prop.label} className="flex items-center gap-2 bg-zinc-800/40 px-2 py-2 rounded-md border border-zinc-700/50 focus-within:border-blue-500 focus-within:bg-zinc-800/60 fluent-smooth fluent-input hover:border-zinc-600/50">
                      <span 
                        className="text-zinc-500 font-semibold text-[10px] w-3 uppercase cursor-ew-resize hover:text-blue-400 select-none transition-colors"
                        onMouseDown={(e) => handleLabelMouseDown(e, prop.key, prop.value)}
                        title={`Drag to scrub ${prop.label}`}
                      >
                        {prop.label}
                      </span>
                      <input 
                        className="bg-transparent w-full outline-none text-white text-xs font-mono tabular-nums" 
                        type="number"
                        value={displayValue}
                        onFocus={() => setLocalValues({ ...localValues, [prop.key]: Math.round(prop.value) })}
                        onBlur={() => {
                          setLocalValues({});
                          handleCommit();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            const step = e.shiftKey ? 10 : 1;
                            const current = prop.value;
                            const newValue = e.key === 'ArrowUp' ? current + step : Math.max(0, current - step);
                            handleBulkUpdate({ [prop.key]: newValue }, true);
                            setLocalValues({ ...localValues, [prop.key]: newValue });
                          }
                        }}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 0;
                          setLocalValues({ ...localValues, [prop.key]: newValue });
                          handleBulkUpdate({ [prop.key]: newValue });
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* W and H with Lock Button - Second Row */}
              <div className="flex items-center gap-2">
                {/* Width Input */}
                {(() => {
                  const prop = { label: 'W', value: firstShape.width, key: 'width' };
                  const displayValue = localValues[prop.key] !== undefined ? localValues[prop.key] : Math.round(prop.value);
                  return (
                    <div className="flex-1 flex items-center gap-2 bg-zinc-800/40 px-2 py-2 rounded-md border border-zinc-700/50 focus-within:border-blue-500 focus-within:bg-zinc-800/60 fluent-smooth fluent-input hover:border-zinc-600/50">
                      <span 
                        className="text-zinc-500 font-semibold text-[10px] w-3 uppercase cursor-ew-resize hover:text-blue-400 select-none transition-colors"
                        onMouseDown={(e) => handleLabelMouseDown(e, prop.key, prop.value)}
                        title={`Drag to scrub ${prop.label}`}
                      >
                        {prop.label}
                      </span>
                      <input 
                        className="bg-transparent w-full outline-none text-white text-xs font-mono tabular-nums" 
                        type="number"
                        value={displayValue}
                        onFocus={() => setLocalValues({ ...localValues, [prop.key]: Math.round(prop.value) })}
                        onBlur={() => {
                          setLocalValues({});
                          handleCommit();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            const step = e.shiftKey ? 10 : 1;
                            const current = prop.value;
                            const newValue = e.key === 'ArrowUp' ? current + step : Math.max(1, current - step);
                            handleBulkUpdate({ [prop.key]: newValue }, true);
                            setLocalValues({ ...localValues, [prop.key]: newValue });
                          }
                        }}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 1;
                          setLocalValues({ ...localValues, [prop.key]: newValue });
                          handleBulkUpdate({ [prop.key]: newValue });
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Aspect Ratio Lock Button */}
                <button
                  onClick={() => toggleAspectRatioLock(firstShape.id)}
                  className={`p-2 rounded-md border transition-all fluent-smooth ${
                    firstShape.aspectRatioLocked
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                  }`}
                  title={firstShape.aspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
                >
                  {firstShape.aspectRatioLocked ? <Link size={14} /> : <Unlink size={14} />}
                </button>

                {/* Height Input */}
                {(() => {
                  const prop = { label: 'H', value: firstShape.height, key: 'height' };
                  const displayValue = localValues[prop.key] !== undefined ? localValues[prop.key] : Math.round(prop.value);
                  return (
                    <div className="flex-1 flex items-center gap-2 bg-zinc-800/40 px-2 py-2 rounded-md border border-zinc-700/50 focus-within:border-blue-500 focus-within:bg-zinc-800/60 fluent-smooth fluent-input hover:border-zinc-600/50">
                      <span 
                        className="text-zinc-500 font-semibold text-[10px] w-3 uppercase cursor-ew-resize hover:text-blue-400 select-none transition-colors"
                        onMouseDown={(e) => handleLabelMouseDown(e, prop.key, prop.value)}
                        title={`Drag to scrub ${prop.label}`}
                      >
                        {prop.label}
                      </span>
                      <input 
                        className="bg-transparent w-full outline-none text-white text-xs font-mono tabular-nums" 
                        type="number"
                        value={displayValue}
                        onFocus={() => setLocalValues({ ...localValues, [prop.key]: Math.round(prop.value) })}
                        onBlur={() => {
                          setLocalValues({});
                          handleCommit();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            const step = e.shiftKey ? 10 : 1;
                            const current = prop.value;
                            const newValue = e.key === 'ArrowUp' ? current + step : Math.max(1, current - step);
                            handleBulkUpdate({ [prop.key]: newValue }, true);
                            setLocalValues({ ...localValues, [prop.key]: newValue });
                          }
                        }}
                        onChange={(e) => {
                          const newValue = parseInt(e.target.value) || 1;
                          setLocalValues({ ...localValues, [prop.key]: newValue });
                          handleBulkUpdate({ [prop.key]: newValue });
                        }}
                      />
                    </div>
                  );
                })()}
              </div>
            </div>
          </SidebarSection>

          {/* 4. APPEARANCE */}
          <SidebarSection title="Appearance">
            <div className="space-y-2">
              {/* Opacity */}
              <div className="flex items-center gap-2 bg-zinc-800/40 px-2 py-2 rounded-md border border-zinc-700/50 focus-within:border-blue-500 focus-within:bg-zinc-800/60 fluent-smooth fluent-input hover:border-zinc-600/50">
                <Droplet size={13} className="text-zinc-500" />
                <span className="text-zinc-400 text-[10px] font-semibold w-12">Opacity</span>
                <input 
                  className="bg-transparent w-full outline-none text-white text-xs font-mono tabular-nums" 
                  value={`${Math.round((firstShape.opacity ?? 1) * 100)}%`}
                  onBlur={handleCommit}
                  onChange={(e) => handleBulkUpdate({ opacity: parseInt(e.target.value.replace('%','')) / 100 || 1 })}
                />
              </div>

              {/* Corner Radius */}
              <div className="flex items-center gap-2 bg-zinc-800/40 px-2 py-2 rounded-md border border-zinc-700/50 focus-within:border-blue-500 focus-within:bg-zinc-800/60 fluent-input fluent-smooth hover:border-zinc-600/50">
                <Square size={13} className="text-zinc-500" />
                <span className="text-zinc-400 text-[10px] font-semibold w-12">Radius</span>
                <input 
                  className="bg-transparent w-full outline-none text-white text-xs font-mono tabular-nums" 
                  type="number"
                  value={firstShape.cornerRadius ?? 0}
                  onBlur={handleCommit}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      const step = e.shiftKey ? 10 : 1;
                      const current = firstShape.cornerRadius ?? 0;
                      handleBulkUpdate({ cornerRadius: e.key === 'ArrowUp' ? current + step : Math.max(0, current - step) });
                    }
                  }}
                  onChange={(e) => handleBulkUpdate({ cornerRadius: parseInt(e.target.value) || 0 })}
                />
                <span className="text-zinc-500 text-[10px]">px</span>
              </div>

              {/* Rotation */}
              <div className="flex items-center gap-2 bg-zinc-800/40 px-2 py-2 rounded-md border border-zinc-700/50 focus-within:border-blue-500 focus-within:bg-zinc-800/60 fluent-input fluent-smooth hover:border-zinc-600/50">
                <RotateCw size={13} className="text-zinc-500" />
                <span className="text-zinc-400 text-[10px] font-semibold w-12">Rotation</span>
                <input 
                  className="bg-transparent w-full outline-none text-white text-xs font-mono tabular-nums" 
                  type="number"
                  value={firstShape.rotation ?? 0}
                  onBlur={handleCommit}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      const step = e.shiftKey ? 10 : 1;
                      const current = firstShape.rotation ?? 0;
                      handleBulkUpdate({ rotation: e.key === 'ArrowUp' ? current + step : current - step });
                    }
                  }}
                  onChange={(e) => handleBulkUpdate({ rotation: parseInt(e.target.value) || 0 })}
                />
                <span className="text-zinc-500 text-[10px]">deg</span>
              </div>
            </div>
          </SidebarSection>

          {/* 4.5 SHADOW */}
          <SidebarSection title="Shadow">
            <div className="space-y-2">
              {/* Shadow Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box size={13} className="text-zinc-500" />
                  <span className="text-zinc-400 text-[10px] font-semibold">Drop Shadow</span>
                </div>
                <button
                  onClick={() => {
                    const currentShadow = firstShape.shadow || { color: '#000000', blur: 10, x: 0, y: 4, enabled: false };
                    handleBulkUpdate({ shadow: { ...currentShadow, enabled: !currentShadow.enabled } }, true);
                  }}
                  className={`px-3 py-1 rounded text-[10px] font-semibold transition-all ${
                    firstShape.shadow?.enabled
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
                      : 'bg-zinc-800/40 text-zinc-500 border border-zinc-700/50 hover:border-zinc-600'
                  }`}
                >
                  {firstShape.shadow?.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Shadow Controls (only visible when enabled) */}
              {firstShape.shadow?.enabled && (
                <div className="space-y-2 pl-5 border-l-2 border-zinc-700/30">
                  {/* Shadow Color */}
                  <div className="flex items-center gap-2 bg-zinc-800/40 px-2 py-2 rounded-md border border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600/50 fluent-smooth">
                    <div className="relative w-5 h-5 rounded overflow-hidden border border-zinc-700/70">
                      <input 
                        type="color" 
                        value={firstShape.shadow.color}
                        onBlur={handleCommit}
                        onChange={(e) => {
                          const currentShadow = firstShape.shadow || { color: '#000000', blur: 10, x: 0, y: 4, enabled: true };
                          handleBulkUpdate({ shadow: { ...currentShadow, color: e.target.value } });
                        }}
                        className="absolute -inset-1 cursor-pointer w-[150%] h-[150%]"
                      />
                    </div>
                    <span className="text-zinc-300 text-[10px] font-mono uppercase">{firstShape.shadow.color}</span>
                  </div>

                  {/* Shadow Blur */}
                  <div className="flex items-center gap-2 bg-zinc-800/40 px-2 py-2 rounded-md border border-zinc-700/50 focus-within:border-blue-500 focus-within:bg-zinc-800/60 fluent-smooth hover:border-zinc-600/50">
                    <span className="text-zinc-400 text-[10px] font-semibold w-8">Blur</span>
                    <input 
                      className="bg-transparent w-full outline-none text-white text-xs font-mono tabular-nums" 
                      type="number"
                      min="0"
                      value={firstShape.shadow.blur}
                      onBlur={handleCommit}
                      onChange={(e) => {
                        const currentShadow = firstShape.shadow || { color: '#000000', blur: 10, x: 0, y: 4, enabled: true };
                        handleBulkUpdate({ shadow: { ...currentShadow, blur: parseInt(e.target.value) || 0 } });
                      }}
                    />
                    <span className="text-zinc-500 text-[10px]">px</span>
                  </div>

                  {/* Shadow Offset X and Y */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Offset X */}
                    <div className="flex items-center gap-2 bg-zinc-800/40 px-2 py-2 rounded-md border border-zinc-700/50 focus-within:border-blue-500 focus-within:bg-zinc-800/60 fluent-smooth hover:border-zinc-600/50">
                      <span className="text-zinc-400 text-[10px] font-semibold w-3">X</span>
                      <input 
                        className="bg-transparent w-full outline-none text-white text-xs font-mono tabular-nums" 
                        type="number"
                        value={firstShape.shadow.x}
                        onBlur={handleCommit}
                        onChange={(e) => {
                          const currentShadow = firstShape.shadow || { color: '#000000', blur: 10, x: 0, y: 4, enabled: true };
                          handleBulkUpdate({ shadow: { ...currentShadow, x: parseInt(e.target.value) || 0 } });
                        }}
                      />
                    </div>

                    {/* Offset Y */}
                    <div className="flex items-center gap-2 bg-zinc-800/40 px-2 py-2 rounded-md border border-zinc-700/50 focus-within:border-blue-500 focus-within:bg-zinc-800/60 fluent-smooth hover:border-zinc-600/50">
                      <span className="text-zinc-400 text-[10px] font-semibold w-3">Y</span>
                      <input 
                        className="bg-transparent w-full outline-none text-white text-xs font-mono tabular-nums" 
                        type="number"
                        value={firstShape.shadow.y}
                        onBlur={handleCommit}
                        onChange={(e) => {
                          const currentShadow = firstShape.shadow || { color: '#000000', blur: 10, x: 0, y: 4, enabled: true };
                          handleBulkUpdate({ shadow: { ...currentShadow, y: parseInt(e.target.value) || 0 } });
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SidebarSection>

          {/* 5. FILL */}
          <SidebarSection title="Fill">
            <div className="flex items-center justify-between gap-3 bg-zinc-800/40 px-3 py-2.5 rounded-md border border-zinc-700/50 group hover:bg-zinc-800/60 hover:border-zinc-600/50 fluent-smooth">
              <div className="flex items-center gap-3">
                <div className="relative w-6 h-6 rounded overflow-hidden border-2 border-zinc-700/70 group-hover:border-zinc-600">
                  <input 
                    type="color" 
                    value={firstShape.fill} 
                    onBlur={handleCommit}
                    onChange={(e) => handleBulkUpdate({ fill: e.target.value })}
                    className="absolute -inset-1 cursor-pointer w-[150%] h-[150%]"
                  />
                </div>
                <span className="text-zinc-300 text-[11px] font-mono uppercase tracking-wide">{firstShape.fill}</span>
              </div>
              <span className="text-zinc-400 text-[10px] font-semibold">100%</span>
            </div>
          </SidebarSection>

          {/* 5. STROKE */}
          <SidebarSection title="Stroke">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 bg-zinc-800/40 px-3 py-2.5 rounded-md border border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600/50 fluent-smooth">
                <div className="flex items-center gap-3">
                  <div className="relative w-6 h-6 rounded overflow-hidden border-2 border-zinc-700/70 hover:border-zinc-600">
                    <input type="color" value={firstShape.stroke} onBlur={handleCommit} onChange={(e) => handleBulkUpdate({ stroke: e.target.value })} className="absolute -inset-1 cursor-pointer w-[150%] h-[150%]" />
                  </div>
                  <span className="text-zinc-300 text-[11px] font-mono uppercase tracking-wide">{firstShape.stroke}</span>
                </div>
                <span className="text-zinc-400 text-[10px] font-semibold">100%</span>
              </div>
              <div className="flex gap-2">
                <select 
                  className="flex-1 bg-zinc-800/50 text-zinc-300 text-[11px] px-2.5 py-2 rounded-md border border-zinc-700/50 outline-none cursor-pointer hover:bg-zinc-800/70 hover:border-zinc-600/50 focus:border-blue-500 fluent-smooth"
                  value={firstShape.strokeAlignment || 'Center'}
                  onChange={(e) => handleBulkUpdate({ strokeAlignment: e.target.value as "Inside" | "Center" | "Outside" })}
                >
                  <option>Inside</option>
                  <option>Center</option>
                  <option>Outside</option>
                </select>
                <input 
                  type="number"
                  className="w-16 bg-zinc-800/50 text-white text-xs px-2 py-2 rounded-md border border-zinc-700/50 outline-none font-mono text-center tabular-nums hover:bg-zinc-800/70 hover:border-zinc-600/50 focus:border-blue-500 fluent-smooth"
                  value={firstShape.strokeWidth}
                  onBlur={handleCommit}
                  onChange={(e) => handleBulkUpdate({ strokeWidth: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </SidebarSection>

          <SidebarSection title="Export">
            <div className="flex flex-col gap-3">
              {/* Dynamic Preview Box */}
              <div className="aspect-video bg-zinc-900/80 rounded-lg flex items-center justify-center border border-zinc-700/60 shadow-inner overflow-hidden">
                {selectedIds.length === 1 && firstShape ? (
                  firstShape.type === 'image' ? (
                    <img 
                      src={firstShape.src} 
                      alt="Preview" 
                      className="max-w-full max-h-full object-contain"
                      style={{
                        opacity: firstShape.opacity ?? 1,
                        borderRadius: `${(firstShape.cornerRadius ?? 0) / 4}px`
                      }}
                    />
                  ) : (
                    <div 
                      style={{ 
                        backgroundColor: firstShape.fill, 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: `${(firstShape.cornerRadius ?? 0) / 2}px`,
                        border: `${(firstShape.strokeWidth ?? 0) / 3}px solid ${firstShape.stroke}`,
                        opacity: firstShape.opacity ?? 1
                      }} 
                    />
                  )
                ) : (
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 bg-zinc-700/60 rounded-md border border-zinc-600/50 rotate-3 translate-x-1 translate-y-1" />
                    <div className="absolute inset-0 bg-blue-600 rounded-md flex items-center justify-center text-white text-sm font-bold shadow-lg">
                      {selectedIds.length}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => exportSelectionToPNG(selectedShapes)}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white py-2.5 rounded-md text-xs font-semibold fluent-smooth flex items-center justify-center gap-2 fluent-button-primary cursor-pointer shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30"
              >
                <Download size={14} />
                Export {selectedIds.length > 1 ? 'Selection' : 'Image'}
              </button>
            </div>
          </SidebarSection>
        </>
      )}
    </div>
  );
};
