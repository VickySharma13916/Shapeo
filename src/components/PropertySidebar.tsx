import React from 'react';
import { 
  ChevronDown, Download, ZoomIn, ZoomOut, PanelRight, Target, Droplet, Square, Home, RotateCw, ChevronsUp, ChevronUp, 
  ChevronDown as ChevronDownIcon, ChevronsDown, AlignLeft, AlignCenter, AlignRight, AlignStartVertical, AlignCenterVertical, 
  AlignEndVertical, Link, Unlink, Box, Magnet
} from 'lucide-react';

import { useStore } from '../store/useStore';

import { exportSelectionToPNG } from '../engine/export';
import type { Shape } from '../engine/types';

const SidebarSection = ({
  title,
  children,
  icon,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const storageKey = `shapeo:property-section:${title.toLowerCase()}`;
  const [isOpen, setIsOpen] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultOpen;
    const stored = window.localStorage.getItem(storageKey);
    if (stored === null) return defaultOpen;
    return stored === '1';
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, isOpen ? '1' : '0');
  }, [isOpen, storageKey]);

  return (
    <div className="border-b ps-divider pb-4 mb-4 last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-0.5 cursor-pointer"
      >
        <span className="text-[11px] font-bold ps-text-title uppercase tracking-wider">{title}</span>
        <span className="flex items-center gap-2">
          {icon}
          <ChevronDown
            size={12}
            className={`ps-text-dim fluent-smooth ${isOpen ? '' : '-rotate-90'}`}
          />
        </span>
      </button>
      {isOpen && <div className="mt-4">{isOpen ? children : null}</div>}
    </div>
  );
};

export default function PropertySidebar() {
  const { 
    pages, currentPageId, selectedIds, updateShape, saveHistory, camera, setCamera, zoomIn, zoomOut, centerObject, rightSidebarVisible, 
    toggleRightSidebar, bringToFront, sendToBack, moveForward, moveBackward, alignLeft, alignCenter, alignRight, alignTop, alignMiddle, 
    alignBottom, toggleAspectRatioLock, pixelSnapEnabled, togglePixelSnap
  } = useStore();

  const currentPage = pages.find(p => p.id === currentPageId);
  const shapes = currentPage?.shapes || [];
  const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
  const firstShape = selectedShapes[0];
  const selectedFrameIds = selectedShapes
    .filter((shape): shape is Extract<Shape, { type: 'frame' }> => shape.type === 'frame')
    .map((shape) => shape.id);

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

  const handleFrameBulkUpdate = (updates: Partial<Extract<Shape, { type: 'frame' }>>, commitNow = false) => {
    selectedFrameIds.forEach((id) => updateShape(id, updates as Partial<Shape>));
    if (commitNow) saveHistory();
  };
  
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
      icon={<span className="ps-text-title text-[10px] font-mono">{Math.round(camera.zoom * 100)}%</span>}
    >
      <div className="grid grid-cols-6 gap-1">
        <button onClick={zoomIn} className="p-2.5 cursor-pointer flex justify-center ps-surface ps-hover-solid rounded ps-text-title fluent-smooth fluent-reveal" title="Zoom In"><ZoomIn size={14} /></button>
        <button onClick={zoomOut} className="p-2.5 cursor-pointer flex justify-center ps-surface ps-hover-solid rounded ps-text-title fluent-smooth fluent-reveal" title="Zoom Out"><ZoomOut size={14} /></button>
        <button onClick={resetView} className="p-2.5 cursor-pointer flex justify-center ps-surface ps-hover-solid rounded ps-text-title fluent-smooth fluent-reveal" title="Reset View"><Home size={14} /></button>
        <button 
          onClick={() => selectedIds.length > 0 && centerObject(selectedIds[0])} 
          disabled={selectedIds.length === 0}
          className={`p-2.5 flex justify-center cursor-pointer rounded fluent-smooth ${selectedIds.length > 0 ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white fluent-reveal' : 'ps-surface-soft ps-text-disabled cursor-not-allowed'}`}
          title="Focus Selection"
        ><Target size={14} /></button>
        <button
          onClick={togglePixelSnap}
          className={`p-2.5 cursor-pointer flex justify-center rounded fluent-smooth ${
            pixelSnapEnabled
              ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white fluent-reveal'
              : 'ps-surface ps-hover-solid ps-text-title'
          }`}
          title={pixelSnapEnabled ? 'Pixel Snap: ON' : 'Pixel Snap: OFF'}
        >
          <Magnet size={14} />
        </button>
      </div>
    </SidebarSection>
  );

  if (!rightSidebarVisible) {
    return (
      <div className="property-sidebar fixed top-4 right-4 w-64 h-auto fluent-acrylic premium-panel rounded-lg z-50 p-3">
        {renderNavigator()}
        <button 
          onClick={toggleRightSidebar}
          className="w-full mt-2 py-1.5 rounded text-[10px] font-bold ps-solid ps-hover-solid ps-text-title fluent-smooth flex items-center justify-center gap-2 fluent-reveal"
        >
          <PanelRight size={14} />
          Show Properties
        </button>
      </div>
    );
  }

  return (
    <div className="property-sidebar fixed top-4 right-4 w-64 h-[calc(100%-30px)] rounded-lg fluent-acrylic premium-panel overflow-y-auto z-50 p-4 select-none flex flex-col fluent-scrollbar">
      <div className="flex justify-between items-center mb-4 px-0.5">
        <span className="text-xs font-bold uppercase tracking-widest opacity-70 ps-text-title">Inspector</span>
        <button onClick={toggleRightSidebar} className="cursor-pointer fluent-smooth fluent-reveal text-blue-400 hover:text-blue-300">
          <PanelRight size={16} />
        </button>
      </div>

      {/* 1. NAVIGATOR */}
      {renderNavigator()}

      {!firstShape ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-20">
          <div className="w-12 h-12 border-2 border-dashed ps-border rounded-lg mb-2" />
          <span className="text-[10px] ps-text-title uppercase font-bold tracking-widest">No Selection</span>
        </div>
      ) : (
        <>
          {/* 2. LAYER (Z-INDEX CONTROLS) */}
          <SidebarSection title="Layer">
            <div className="grid grid-cols-4 gap-2">
              <button 
                onClick={moveForward}
                className="flex flex-col items-center justify-center ps-surface px-2 py-2.5 rounded-md border ps-border hover:border-blue-500 ps-hover-surface fluent-smooth fluent-reveal cursor-pointer"
                title="Move forward one layer"
              >
                <ChevronUp size={16} className="ps-text-muted" />
                <span className="text-[9px] ps-text-subtle mt-0.5 font-semibold">+1</span>
              </button>
              <button 
                onClick={bringToFront}
                className="flex flex-col items-center justify-center ps-surface px-2 py-2.5 rounded-md border ps-border hover:border-blue-500 ps-hover-surface fluent-smooth fluent-reveal cursor-pointer"
                title="Bring to front"
              >
                <ChevronsUp size={16} className="ps-text-muted" />
                <span className="text-[9px] ps-text-subtle mt-0.5 font-semibold">Front</span>
              </button>
              <button 
                onClick={sendToBack}
                className="flex flex-col items-center justify-center ps-surface px-2 py-2.5 rounded-md border ps-border hover:border-blue-500 ps-hover-surface fluent-smooth fluent-reveal cursor-pointer"
                title="Send to back"
              >
                <ChevronsDown size={16} className="ps-text-muted" />
                <span className="text-[9px] ps-text-subtle mt-0.5 font-semibold">Back</span>
              </button>
              <button 
                onClick={moveBackward}
                className="flex flex-col items-center justify-center ps-surface px-2 py-2.5 rounded-md border ps-border hover:border-blue-500 ps-hover-surface fluent-smooth fluent-reveal cursor-pointer"
                title="Move backward one layer"
              >
                <ChevronDownIcon size={16} className="ps-text-muted" />
                <span className="text-[9px] ps-text-subtle mt-0.5 font-semibold">-1</span>
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
                    className="flex flex-col items-center justify-center ps-surface px-2 py-2.5 rounded-md border ps-border hover:border-blue-500 ps-hover-surface fluent-smooth fluent-reveal cursor-pointer"
                    title="Align left edges"
                  >
                    <AlignLeft size={16} className="ps-text-muted" />
                    <span className="text-[9px] ps-text-subtle mt-0.5 font-semibold">Left</span>
                  </button>
                  <button 
                    onClick={alignCenter}
                    className="flex flex-col items-center justify-center ps-surface px-2 py-2.5 rounded-md border ps-border hover:border-blue-500 ps-hover-surface fluent-smooth fluent-reveal cursor-pointer"
                    title="Align horizontal centers"
                  >
                    <AlignCenter size={16} className="ps-text-muted" />
                    <span className="text-[9px] ps-text-subtle mt-0.5 font-semibold">Center</span>
                  </button>
                  <button 
                    onClick={alignRight}
                    className="flex flex-col items-center justify-center ps-surface px-2 py-2.5 rounded-md border ps-border hover:border-blue-500 ps-hover-surface fluent-smooth fluent-reveal cursor-pointer"
                    title="Align right edges"
                  >
                    <AlignRight size={16} className="ps-text-muted" />
                    <span className="text-[9px] ps-text-subtle mt-0.5 font-semibold">Right</span>
                  </button>
                </div>
                {/* Vertical Alignment */}
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={alignTop}
                    className="flex flex-col items-center justify-center ps-surface px-2 py-2.5 rounded-md border ps-border hover:border-blue-500 ps-hover-surface fluent-smooth fluent-reveal cursor-pointer"
                    title="Align top edges"
                  >
                    <AlignStartVertical size={16} className="ps-text-muted" />
                    <span className="text-[9px] ps-text-subtle mt-0.5 font-semibold">Top</span>
                  </button>
                  <button 
                    onClick={alignMiddle}
                    className="flex flex-col items-center justify-center ps-surface px-2 py-2.5 rounded-md border ps-border hover:border-blue-500 ps-hover-surface fluent-smooth fluent-reveal cursor-pointer"
                    title="Align vertical centers"
                  >
                    <AlignCenterVertical size={16} className="ps-text-muted" />
                    <span className="text-[9px] ps-text-subtle mt-0.5 font-semibold">Middle</span>
                  </button>
                  <button 
                    onClick={alignBottom}
                    className="flex flex-col items-center justify-center ps-surface px-2 py-2.5 rounded-md border ps-border hover:border-blue-500 ps-hover-surface fluent-smooth fluent-reveal cursor-pointer"
                    title="Align bottom edges"
                  >
                    <AlignEndVertical size={16} className="ps-text-muted" />
                    <span className="text-[9px] ps-text-subtle mt-0.5 font-semibold">Bottom</span>
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
                    <div key={prop.label} className="flex items-center gap-2 ps-surface px-2 py-2 rounded-md border ps-border focus-within:border-blue-500 ps-focus-surface fluent-smooth fluent-input ps-hover-border">
                      <span 
                        className="ps-text-subtle font-semibold text-[10px] w-3 uppercase cursor-ew-resize hover:text-blue-400 select-none transition-colors"
                        onMouseDown={(e) => handleLabelMouseDown(e, prop.key, prop.value)}
                        title={`Drag to scrub ${prop.label}`}
                      >
                        {prop.label}
                      </span>
                      <input 
                        className="bg-transparent w-full outline-none ps-text-title text-xs font-mono tabular-nums" 
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
                    <div className="flex-1 flex items-center gap-2 ps-surface px-2 py-2 rounded-md border ps-border focus-within:border-blue-500 ps-focus-surface fluent-smooth fluent-input ps-hover-border">
                      <span 
                        className="ps-text-subtle font-semibold text-[10px] w-3 uppercase cursor-ew-resize hover:text-blue-400 select-none transition-colors"
                        onMouseDown={(e) => handleLabelMouseDown(e, prop.key, prop.value)}
                        title={`Drag to scrub ${prop.label}`}
                      >
                        {prop.label}
                      </span>
                      <input 
                        className="bg-transparent w-full outline-none ps-text-title text-xs font-mono tabular-nums" 
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
                      : 'ps-surface ps-border ps-text-subtle ps-hover-border ps-hover-text-muted'
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
                    <div className="flex-1 flex items-center gap-2 ps-surface px-2 py-2 rounded-md border ps-border focus-within:border-blue-500 ps-focus-surface fluent-smooth fluent-input ps-hover-border">
                      <span 
                        className="ps-text-subtle font-semibold text-[10px] w-3 uppercase cursor-ew-resize hover:text-blue-400 select-none transition-colors"
                        onMouseDown={(e) => handleLabelMouseDown(e, prop.key, prop.value)}
                        title={`Drag to scrub ${prop.label}`}
                      >
                        {prop.label}
                      </span>
                      <input 
                        className="bg-transparent w-full outline-none ps-text-title text-xs font-mono tabular-nums" 
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
              <div className="flex items-center gap-2 ps-surface px-2 py-2 rounded-md border ps-border focus-within:border-blue-500 ps-focus-surface fluent-smooth fluent-input ps-hover-border">
                <Droplet size={13} className="ps-text-subtle" />
                <span className="ps-text-muted text-[10px] font-semibold w-12">Opacity</span>
                <input 
                  className="bg-transparent w-full outline-none ps-text-title text-xs font-mono tabular-nums" 
                  value={`${Math.round((firstShape.opacity ?? 1) * 100)}%`}
                  onBlur={handleCommit}
                  onChange={(e) => handleBulkUpdate({ opacity: parseInt(e.target.value.replace('%','')) / 100 || 1 })}
                />
              </div>

              {/* Corner Radius */}
              <div className="flex items-center gap-2 ps-surface px-2 py-2 rounded-md border ps-border focus-within:border-blue-500 ps-focus-surface fluent-input fluent-smooth ps-hover-border">
                <Square size={13} className="ps-text-subtle" />
                <span className="ps-text-muted text-[10px] font-semibold w-12">Radius</span>
                <input 
                  className="bg-transparent w-full outline-none ps-text-title text-xs font-mono tabular-nums" 
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
                <span className="ps-text-subtle text-[10px]">px</span>
              </div>

              {/* Rotation */}
              <div className="flex items-center gap-2 ps-surface px-2 py-2 rounded-md border ps-border focus-within:border-blue-500 ps-focus-surface fluent-input fluent-smooth ps-hover-border">
                <RotateCw size={13} className="ps-text-subtle" />
                <span className="ps-text-muted text-[10px] font-semibold w-12">Rotation</span>
                <input 
                  className="bg-transparent w-full outline-none ps-text-title text-xs font-mono tabular-nums" 
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
                <span className="ps-text-subtle text-[10px]">deg</span>
              </div>

              {firstShape.type === 'frame' && (
                <>
                  <div className="flex items-center justify-between ps-surface px-2 py-2 rounded-md border ps-border ps-hover-border fluent-smooth">
                    <span className="ps-text-muted text-[10px] font-semibold">Clip Content</span>
                    <button
                      onClick={() => handleFrameBulkUpdate({ clipContent: !(firstShape.clipContent ?? true) }, true)}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold fluent-smooth ${
                        (firstShape.clipContent ?? true)
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
                          : 'ps-surface ps-text-subtle border ps-border'
                      }`}
                    >
                      {(firstShape.clipContent ?? true) ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="space-y-2 ps-surface px-2 py-2 rounded-md border ps-border">
                    <div className="flex items-center justify-between gap-2">
                      <span className="ps-text-muted text-[10px] font-semibold">Auto Layout</span>
                      <select
                        className="ps-surface ps-text-strong text-[11px] px-2 py-1 rounded-md border ps-border outline-none cursor-pointer focus:border-blue-500 fluent-smooth"
                        value={firstShape.layoutMode ?? 'none'}
                        onChange={(e) =>
                          handleFrameBulkUpdate(
                            {
                              layoutMode: e.target.value as 'none' | 'horizontal' | 'vertical',
                            },
                            true
                          )
                        }
                      >
                        <option value="none">Off</option>
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                      </select>
                    </div>

                    {(firstShape.layoutMode ?? 'none') !== 'none' && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="ps-text-muted text-[10px] font-semibold w-14">Gap</span>
                          <input
                            type="number"
                            min={0}
                            className="bg-transparent w-full outline-none ps-text-title text-xs font-mono tabular-nums border ps-border rounded px-2 py-1"
                            value={firstShape.layoutGap ?? 12}
                            onBlur={handleCommit}
                            onChange={(e) =>
                              handleFrameBulkUpdate({ layoutGap: Math.max(0, parseInt(e.target.value) || 0) })
                            }
                          />
                        </div>

                        <div>
                          <span className="ps-text-muted text-[10px] font-semibold">Padding</span>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {[
                              { key: 'top', label: 'Top' },
                              { key: 'right', label: 'Right' },
                              { key: 'bottom', label: 'Bottom' },
                              { key: 'left', label: 'Left' },
                            ].map((item) => (
                              <div key={item.key} className="flex items-center gap-2">
                                <span className="ps-text-subtle text-[9px] w-8">{item.label}</span>
                                <input
                                  type="number"
                                  min={0}
                                  className="bg-transparent w-full outline-none ps-text-title text-xs font-mono tabular-nums border ps-border rounded px-2 py-1"
                                  value={firstShape.layoutPadding?.[item.key as 'top' | 'right' | 'bottom' | 'left'] ?? 16}
                                  onBlur={handleCommit}
                                  onChange={(e) =>
                                    handleFrameBulkUpdate({
                                      layoutPadding: {
                                        top: firstShape.layoutPadding?.top ?? 16,
                                        right: firstShape.layoutPadding?.right ?? 16,
                                        bottom: firstShape.layoutPadding?.bottom ?? 16,
                                        left: firstShape.layoutPadding?.left ?? 16,
                                        [item.key]: Math.max(0, parseInt(e.target.value) || 0),
                                      },
                                    })
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <span className="ps-text-subtle text-[9px]">Primary</span>
                            <select
                              className="w-full ps-surface ps-text-strong text-[11px] px-2 py-1 rounded-md border ps-border outline-none cursor-pointer focus:border-blue-500 fluent-smooth"
                              value={firstShape.primaryAxisAlign ?? 'start'}
                              onChange={(e) =>
                                handleFrameBulkUpdate(
                                  { primaryAxisAlign: e.target.value as 'start' | 'center' | 'end' | 'space-between' },
                                  true
                                )
                              }
                            >
                              <option value="start">Start</option>
                              <option value="center">Center</option>
                              <option value="end">End</option>
                              <option value="space-between">Space Between</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <span className="ps-text-subtle text-[9px]">Cross</span>
                            <select
                              className="w-full ps-surface ps-text-strong text-[11px] px-2 py-1 rounded-md border ps-border outline-none cursor-pointer focus:border-blue-500 fluent-smooth"
                              value={firstShape.crossAxisAlign ?? 'start'}
                              onChange={(e) =>
                                handleFrameBulkUpdate(
                                  { crossAxisAlign: e.target.value as 'start' | 'center' | 'end' },
                                  true
                                )
                              }
                            >
                              <option value="start">Start</option>
                              <option value="center">Center</option>
                              <option value="end">End</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </SidebarSection>

          {/* 4.5 SHADOW */}
          <SidebarSection title="Shadow">
            <div className="space-y-2">
              {/* Shadow Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Box size={13} className="ps-text-subtle" />
                  <span className="ps-text-muted text-[10px] font-semibold">Drop Shadow</span>
                </div>
                <button
                  onClick={() => {
                    const currentShadow = firstShape.shadow || { color: '#000000', blur: 10, x: 0, y: 4, enabled: false };
                    handleBulkUpdate({ shadow: { ...currentShadow, enabled: !currentShadow.enabled } }, true);
                  }}
                  className={`px-3 py-1 rounded text-[10px] font-semibold transition-all ${
                    firstShape.shadow?.enabled
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
                      : 'ps-surface ps-text-subtle border ps-border ps-hover-border'
                  }`}
                >
                  {firstShape.shadow?.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Shadow Controls (only visible when enabled) */}
              {firstShape.shadow?.enabled && (
                <div className="space-y-2 pl-5 border-l-2 ps-border-soft">
                  {/* Shadow Color */}
                  <div className="flex items-center gap-2 ps-surface px-2 py-2 rounded-md border ps-border ps-hover-surface ps-hover-border fluent-smooth">
                    <div className="relative w-5 h-5 rounded overflow-hidden border ps-border-strong">
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
                    <span className="ps-text-strong text-[10px] font-mono uppercase">{firstShape.shadow.color}</span>
                  </div>

                  {/* Shadow Blur */}
                  <div className="flex items-center gap-2 ps-surface px-2 py-2 rounded-md border ps-border focus-within:border-blue-500 ps-focus-surface fluent-smooth ps-hover-border">
                    <span className="ps-text-muted text-[10px] font-semibold w-8">Blur</span>
                    <input 
                      className="bg-transparent w-full outline-none ps-text-title text-xs font-mono tabular-nums" 
                      type="number"
                      min="0"
                      value={firstShape.shadow.blur}
                      onBlur={handleCommit}
                      onChange={(e) => {
                        const currentShadow = firstShape.shadow || { color: '#000000', blur: 10, x: 0, y: 4, enabled: true };
                        handleBulkUpdate({ shadow: { ...currentShadow, blur: parseInt(e.target.value) || 0 } });
                      }}
                    />
                    <span className="ps-text-subtle text-[10px]">px</span>
                  </div>

                  {/* Shadow Offset X and Y */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Offset X */}
                    <div className="flex items-center gap-2 ps-surface px-2 py-2 rounded-md border ps-border focus-within:border-blue-500 ps-focus-surface fluent-smooth ps-hover-border">
                      <span className="ps-text-muted text-[10px] font-semibold w-3">X</span>
                      <input 
                        className="bg-transparent w-full outline-none ps-text-title text-xs font-mono tabular-nums" 
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
                    <div className="flex items-center gap-2 ps-surface px-2 py-2 rounded-md border ps-border focus-within:border-blue-500 ps-focus-surface fluent-smooth ps-hover-border">
                      <span className="ps-text-muted text-[10px] font-semibold w-3">Y</span>
                      <input 
                        className="bg-transparent w-full outline-none ps-text-title text-xs font-mono tabular-nums" 
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
            <div className="flex items-center justify-between gap-3 ps-surface px-3 py-2.5 rounded-md border ps-border group ps-hover-surface ps-hover-border fluent-smooth">
              <div className="flex items-center gap-3">
                <div className="relative w-6 h-6 rounded overflow-hidden border-2 ps-border-strong ps-group-hover-border">
                  <input 
                    type="color" 
                    value={firstShape.fill} 
                    onBlur={handleCommit}
                    onChange={(e) => handleBulkUpdate({ fill: e.target.value })}
                    className="absolute -inset-1 cursor-pointer w-[150%] h-[150%]"
                  />
                </div>
                <span className="ps-text-strong text-[11px] font-mono uppercase tracking-wide">{firstShape.fill}</span>
              </div>
              <span className="ps-text-muted text-[10px] font-semibold">100%</span>
            </div>
          </SidebarSection>

          {/* 5. STROKE */}
          <SidebarSection title="Stroke">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 ps-surface px-3 py-2.5 rounded-md border ps-border ps-hover-surface ps-hover-border fluent-smooth">
                <div className="flex items-center gap-3">
                  <div className="relative w-6 h-6 rounded overflow-hidden border-2 ps-border-strong ps-hover-border">
                    <input type="color" value={firstShape.stroke} onBlur={handleCommit} onChange={(e) => handleBulkUpdate({ stroke: e.target.value })} className="absolute -inset-1 cursor-pointer w-[150%] h-[150%]" />
                  </div>
                  <span className="ps-text-strong text-[11px] font-mono uppercase tracking-wide">{firstShape.stroke}</span>
                </div>
                <span className="ps-text-muted text-[10px] font-semibold">100%</span>
              </div>
              <div className="flex gap-2">
                <select 
                  className="flex-1 ps-surface ps-text-strong text-[11px] px-2.5 py-2 rounded-md border ps-border outline-none cursor-pointer ps-hover-surface ps-hover-border focus:border-blue-500 fluent-smooth"
                  value={firstShape.strokeAlignment || 'Center'}
                  onChange={(e) => handleBulkUpdate({ strokeAlignment: e.target.value as "Inside" | "Center" | "Outside" })}
                >
                  <option>Inside</option>
                  <option>Center</option>
                  <option>Outside</option>
                </select>
                <input 
                  type="number"
                  className="w-16 ps-surface ps-text-title text-xs px-2 py-2 rounded-md border ps-border outline-none font-mono text-center tabular-nums ps-hover-surface ps-hover-border focus:border-blue-500 fluent-smooth"
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
              <div className="aspect-video ps-preview-bg rounded-lg flex items-center justify-center border ps-border shadow-inner overflow-hidden">
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
                    <div className="absolute inset-0 ps-solid-hover-60 rounded-md border ps-border-strong rotate-3 translate-x-1 translate-y-1" />
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
