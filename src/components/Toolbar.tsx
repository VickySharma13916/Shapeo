'use client';
import { Circle, Hand, Minus, MousePointer2, RotateCcw, RotateCw, Square, SquareDashed, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ShapeType, type ShapeType as ShapeTypeType } from '../engine/types';

import { useStore } from '../store/useStore';

import ToolbarDropdown, { type ToolOption } from './ToolbarDropdown';

const Toolbar = () => {
  const { addShape, selectedIds, setSelectedIds, pages, currentPageId, deleteShapes, mode, theme, setMode, undo, redo, deleteImage } = useStore();
  const isLight = theme === 'light';
  const [activeShapeTool, setActiveShapeTool] = useState<ShapeTypeType>(ShapeType.Rectangle);

  // FIX: Derive shapes from the active page so Select All works correctly
  const currentPage = pages.find(p => p.id === currentPageId);
  const currentShapes = currentPage?.shapes || [];

  const handleSelectAll = () => {
    const allIds = currentShapes.map(s => s.id);
    setSelectedIds(allIds);
  };

  // Shape tool options for dropdown
  const shapeOptions: ToolOption[] = [
    {
      id: ShapeType.Rectangle,
      label: 'Rectangle',
      icon: <Square size={18} />,
      shortcut: 'R',
      action: () => {
        setActiveShapeTool(ShapeType.Rectangle);
        addShape(ShapeType.Rectangle);
      },
    },
    {
      id: ShapeType.Line,
      label: 'Line',
      icon: <Minus size={18} />,
      shortcut: 'L',
      action: () => {
        setActiveShapeTool(ShapeType.Line);
        addShape(ShapeType.Line);
      },
    },
    {
      id: ShapeType.Ellipse,
      label: 'Ellipse',
      icon: <Circle size={18} />,
      shortcut: 'O',
      action: () => {
        setActiveShapeTool(ShapeType.Ellipse);
        addShape(ShapeType.Ellipse);
      },
    },
  ];

  return (
    <div
      className={`app-toolbar fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2.5 rounded-2xl z-50 ${
        isLight
          ? 'bg-white/88 border border-slate-300/80 shadow-[0_14px_32px_rgba(15,23,42,0.16)]'
          : 'fluent-acrylic border border-white/15 fluent-depth-32 shadow-[0_18px_40px_rgba(0,0,0,0.45)]'
      }`}
    >
      {/* Selection Mode Toggles */}
      <div
        className={`flex rounded-xl p-1 gap-1 border ${
          isLight
            ? 'bg-slate-100 border-slate-300/60'
            : 'bg-black/25 border-white/5'
        }`}
      >
        <button
          onClick={() => setMode('select')}
          className={`p-2 rounded-lg fluent-smooth cursor-pointer ${
            mode === 'select'
              ? 'bg-blue-600 text-white fluent-depth-8'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                : 'text-zinc-500 hover:text-zinc-200 fluent-reveal'
          }`}
          title="Select Tool (V)"
        >
          <MousePointer2 size={18} />
        </button>

        <button 
          onClick={() => setMode('pan')}
          className={`p-2 rounded-lg fluent-smooth cursor-pointer ${
            mode === 'pan'
              ? 'bg-blue-600 text-white fluent-depth-8'
              : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                : 'text-zinc-500 hover:text-zinc-200 fluent-reveal'
          }`}
          title="Hand Tool (H)"
        >
          <Hand size={18} />
        </button>
      </div>

      <div className={`w-px h-6 mx-1 ${isLight ? 'bg-slate-300/80' : 'fluent-divider-vertical'}`} />

      {/* History Controls */}
      <div className="flex gap-0.5">
        <button 
          onClick={undo} 
          className={`p-2 rounded-lg fluent-smooth cursor-pointer ${
            isLight
              ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/80'
              : 'hover:bg-white/5 text-zinc-400 hover:text-white fluent-reveal'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw size={18} />
        </button>
        <button 
          onClick={redo} 
          className={`p-2 rounded-lg fluent-smooth cursor-pointer ${
            isLight
              ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/80'
              : 'hover:bg-white/5 text-zinc-400 hover:text-white fluent-reveal'
          }`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <RotateCw size={18} />
        </button>
      </div>

      <div className={`w-px h-6 mx-1 ${isLight ? 'bg-slate-300/80' : 'fluent-divider-vertical'}`} />
      
      {/* Selection Actions */}
      <button 
        onClick={handleSelectAll}
        className={`p-2 rounded-lg fluent-smooth cursor-pointer ${
          isLight
            ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/80'
            : 'hover:bg-white/5 text-zinc-400 hover:text-white fluent-reveal'
        }`}
        title="Select All (Ctrl+A)"
      >
        <SquareDashed size={18} />
      </button>

      {/* Shape Dropdown */}
      <ToolbarDropdown
        options={shapeOptions}
        activeToolId={activeShapeTool}
      />
      
      {/* Delete Selection */}
      <button 
        onClick={selectedIds.length === 1 && currentShapes.find(s => s.id === selectedIds[0])?.type === ShapeType.Image ? () => deleteImage(selectedIds[0]) : deleteShapes}
        disabled={selectedIds.length === 0}
        className={`p-2 rounded-lg fluent-smooth cursor-pointer ${
          selectedIds.length > 0
            ? 'bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white fluent-reveal' 
            : 'text-zinc-700 cursor-not-allowed'
        }`}
        title="Delete Selection (Del)"
      >
        <Trash2 size={20} />
      </button>

      {/* Selection Counter */}
      {selectedIds.length > 1 && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 fluent-acrylic bg-blue-600/25 text-white text-[10px] px-3 py-1.5 rounded-full font-bold fluent-depth-8 whitespace-nowrap fluent-animate-in border border-blue-300/35 shadow-[0_8px_24px_rgba(37,99,235,0.35)]">
          {selectedIds.length} objects selected
        </div>
      )}
    </div>
  );
};

export default Toolbar;
