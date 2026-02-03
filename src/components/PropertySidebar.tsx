import React from 'react';
import { ChevronDown, Download, ZoomIn, ZoomOut, PanelRight, Target, Droplet, Square, Home } from 'lucide-react';

import { useStore } from '../store/useStore';

import { exportToPNG } from '../engine/export';
import type { Shape } from '../engine/types';

const SidebarSection = ({ title, children, icon }: { title: string, children: React.ReactNode, icon?: React.ReactNode }) => (
  <div className="border-b border-[#444444] pb-4 mb-4">
    <div className="flex items-center justify-between mb-3 px-1">
      <span className="text-[11px] font-bold text-white uppercase tracking-tight">{title}</span>
      {icon || <ChevronDown size={12} className="text-zinc-600" />}
    </div>
    {children}
  </div>
);

const PropertySidebar = () => {
  const { 
    pages, currentPageId, selectedIds, updateShape, saveHistory, zoomIn, zoomOut, camera, setCamera, centerObject, 
    toggleRightSidebar, rightSidebarVisible
  } = useStore();
  
  // FIX: Centralized data derivation
  const currentPage = pages.find(p => p.id === currentPageId);
  const shapes = currentPage?.shapes || [];
  const selectedShapes = shapes.filter(s => selectedIds.includes(s.id));
  const firstShape = selectedShapes[0];

  const handleBulkUpdate = (updates: Partial<Shape>) => {
    selectedIds.forEach(id => updateShape(id, updates));
  };

  const handleCommit = () => saveHistory();
  
  // Added Figma-style reset view
  const resetView = () => setCamera({ x: 0, y: 0, zoom: 1 });

  const renderNavigator = () => (
    <SidebarSection 
      title="Navigator" 
      icon={<span className="text-white text-[10px] font-mono">{Math.round(camera.zoom * 100)}%</span>}
    >
      <div className="grid grid-cols-5 gap-1">
        <button onClick={zoomIn} className="p-2.5 cursor-pointer flex justify-center bg-zinc-800/40 hover:bg-zinc-700 rounded text-white transition-colors" title="Zoom In"><ZoomIn size={14} /></button>
        <button onClick={zoomOut} className="p-2.5 cursor-pointer flex justify-center bg-zinc-800/40 hover:bg-zinc-700 rounded text-white transition-colors" title="Zoom Out"><ZoomOut size={14} /></button>
        <button onClick={resetView} className="p-2.5 cursor-pointer flex justify-center bg-zinc-800/40 hover:bg-zinc-700 rounded text-white transition-colors" title="Reset View"><Home size={14} /></button>
        <button 
          onClick={() => selectedIds.length > 0 && centerObject(selectedIds[0])} 
          disabled={selectedIds.length === 0}
          className={`p-2.5 flex justify-center cursor-pointer rounded transition-colors ${selectedIds.length > 0 ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white' : 'bg-zinc-800/20 text-zinc-700 cursor-not-allowed'}`}
          title="Focus Selection"
        ><Target size={14} /></button>
        {/* <button onClick={toggleGrid} className="p-2.5 cursor-pointer flex justify-center bg-zinc-800/40 hover:bg-zinc-700 rounded text-white transition-colors" title="Toggle Grid"><Grid3x3 size={14} /></button> */}
      </div>
    </SidebarSection>
  );

  if (!rightSidebarVisible) {
    return (
      <div className="fixed top-4 right-4 w-64 h-auto bg-[#2c2c2c] border border-[#444444] rounded-lg z-50 p-3 shadow-2xl">
        {renderNavigator()}
        <button 
          onClick={toggleRightSidebar}
          className="w-full mt-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-bold transition-all flex items-center justify-center gap-2"
        >
          <PanelRight size={14} />
          Show Properties
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 w-64 h-[calc(100%-30px)] rounded-lg bg-[#2c2c2c] border border-[#444444] overflow-y-auto z-50 p-3 select-none shadow-2xl flex flex-col scrollbar-hide">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-white text-[10px] font-bold uppercase tracking-widest opacity-50">Inspector</span>
        <button onClick={toggleRightSidebar} className="text-blue-400 hover:text-white cursor-pointer transition-colors">
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
          {/* 2. TRANSFORMATION */}
          <SidebarSection title="Transform">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'X', value: firstShape.x, key: 'x' },
                { label: 'Y', value: firstShape.y, key: 'y' },
                { label: 'W', value: firstShape.width, key: 'width' },
                { label: 'H', value: firstShape.height, key: 'height' },
              ].map((prop) => (
                <div key={prop.label} className="flex items-center gap-2 bg-zinc-800/30 p-1.5 rounded border border-transparent focus-within:border-blue-600 transition-all">
                  <span className="text-zinc-600 font-mono text-[9px] w-3">{prop.label}</span>
                  <input 
                    className="bg-transparent w-full outline-none text-zinc-200 text-xs font-mono" 
                    type="number"
                    value={Math.round(prop.value)} 
                    onBlur={handleCommit}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        const step = e.shiftKey ? 10 : 1;
                        const current = firstShape.cornerRadius ?? 0;
                        handleBulkUpdate({ cornerRadius: e.key === 'ArrowUp' ? current + step : Math.max(0, current - step) });
                      }
                    }}
                    onChange={(e) => handleBulkUpdate({ [prop.key]: parseInt(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>
          </SidebarSection>

          {/* 3. APPEARANCE */}
          <SidebarSection title="Appearance">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 bg-zinc-800/30 p-1.5 rounded border border-transparent focus-within:border-blue-600">
                <Droplet size={12} className="text-zinc-600" />
                <input 
                  className="bg-transparent w-full outline-none text-zinc-200 text-xs font-mono" 
                  value={`${Math.round((firstShape.opacity ?? 1) * 100)}%`}
                  onBlur={handleCommit}
                  onChange={(e) => handleBulkUpdate({ opacity: parseInt(e.target.value.replace('%','')) / 100 || 1 })}
                />
              </div>
              <div className="flex items-center gap-2 bg-zinc-800/30 p-1.5 rounded border border-transparent focus-within:border-blue-600">
                <Square size={12} className="text-zinc-600" />
                <input 
                  className="bg-transparent w-full outline-none text-zinc-200 text-xs font-mono" 
                  value={firstShape.cornerRadius ?? 0}
                  onBlur={handleCommit}
                  onChange={(e) => handleBulkUpdate({ cornerRadius: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </SidebarSection>

          {/* 4. FILL */}
          <SidebarSection title="Fill">
            <div className="flex items-center justify-between gap-2 bg-zinc-800/30 p-1 rounded group hover:bg-zinc-800/60 transition-all">
              <div className="flex items-center gap-2">
                <div className="relative w-5 h-5 rounded overflow-hidden border border-zinc-700">
                  <input 
                    type="color" 
                    value={firstShape.fill} 
                    onBlur={handleCommit}
                    onChange={(e) => handleBulkUpdate({ fill: e.target.value })}
                    className="absolute -inset-1 cursor-pointer w-[150%] h-[150%]"
                  />
                </div>
                <span className="text-zinc-300 text-[10px] font-mono uppercase truncate w-16">{firstShape.fill}</span>
              </div>
              <span className="text-white text-[10px] mr-1 opacity-50">100%</span>
            </div>
          </SidebarSection>

          {/* 5. STROKE */}
          <SidebarSection title="Stroke">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 bg-zinc-800/30 p-1 rounded">
                <div className="flex items-center gap-2">
                  <div className="relative w-5 h-5 rounded overflow-hidden border border-zinc-700">
                    <input type="color" value={firstShape.stroke} onBlur={handleCommit} onChange={(e) => handleBulkUpdate({ stroke: e.target.value })} className="absolute -inset-1 cursor-pointer w-[150%] h-[150%]" />
                  </div>
                  <span className="text-zinc-300 text-[10px] font-mono uppercase truncate w-16">{firstShape.stroke}</span>
                </div>
                <span className="text-white text-[10px] mr-1 opacity-50">100%</span>
              </div>
              <div className="flex gap-2">
                <select 
                  className="flex-1 bg-zinc-800/50 text-zinc-300 text-[10px] p-1.5 rounded border border-zinc-700 outline-none cursor-pointer"
                  value={firstShape.strokeAlignment || 'Center'}
                  onChange={(e) => handleBulkUpdate({ strokeAlignment: e.target.value as any })}
                >
                  <option>Inside</option>
                  <option>Center</option>
                  <option>Outside</option>
                </select>
                <input 
                  className="w-12 bg-zinc-800/50 text-zinc-300 text-[10px] p-1.5 rounded border border-zinc-700 outline-none font-mono text-center"
                  value={firstShape.strokeWidth}
                  onChange={(e) => handleBulkUpdate({ strokeWidth: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </SidebarSection>

          {/* 6. EXPORT */}
          {/* <SidebarSection title="Export">
            <div className="flex flex-col gap-3">
              <div className="aspect-video bg-[#121214] rounded-md flex items-center justify-center border border-[#444444] shadow-inner overflow-hidden mb-2">
                {selectedIds.length === 1 ? (
                  <div 
                    style={{ 
                      backgroundColor: firstShape.fill, 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: `${(firstShape.cornerRadius ?? 0) / 2}px`,
                      boxShadow: firstShape.shadow?.enabled 
                        ? `${firstShape.shadow.x/2}px ${firstShape.shadow.y/2}px ${firstShape.shadow.blur/2}px ${firstShape.shadow.color}` 
                        : 'none',
                      border: `${(firstShape.strokeWidth ?? 0) / 4}px solid ${firstShape.stroke}`
                    }} 
                  />
                ) : (
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 bg-zinc-700 rounded-sm border border-zinc-600 rotate-3 translate-x-1" />
                    <div className="absolute inset-0 bg-zinc-600 rounded-sm border border-zinc-500 -rotate-3 -translate-x-1" />
                    <div className="absolute inset-0 bg-blue-600 rounded-sm flex items-center justify-center text-[10px] font-bold">
                      {selectedIds.length}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => selectedShapes.forEach(s => exportToPNG(s))}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-[11px] font-bold transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] cursor-pointer"
              >
                <Download size={12} />
                Export {selectedIds.length > 1 ? `${selectedIds.length} Layers` : 'Selection'}
              </button>
            </div>
          </SidebarSection> */}

          <SidebarSection title="Export">
            <div className="flex flex-col gap-3">
              {/* Dynamic Preview Box */}
              <div className="aspect-video bg-[#121214] rounded-md flex items-center justify-center border border-[#444444] shadow-inner overflow-hidden mb-2">
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
                        width: '40px', 
                        height: '40px', 
                        borderRadius: `${(firstShape.cornerRadius ?? 0) / 2}px`,
                        border: `${(firstShape.strokeWidth ?? 0) / 4}px solid ${firstShape.stroke}`
                      }} 
                    />
                  )
                ) : (
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 bg-zinc-700 rounded-sm border border-zinc-600 rotate-3 translate-x-1" />
                    <div className="absolute inset-0 bg-blue-600 rounded-sm flex items-center justify-center text-[10px] font-bold">
                      {selectedIds.length}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => selectedShapes.forEach(s => exportToPNG(s))}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-[11px] font-bold transition-all flex items-center justify-center gap-2"
              >
                <Download size={12} />
                Export {selectedIds.length > 1 ? 'Selection' : 'Image'}
              </button>
            </div>
          </SidebarSection>
        </>
      )}
    </div>
  );
};

export default PropertySidebar;