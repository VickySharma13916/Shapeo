'use client';
import {
  ChevronDown, Circle, Copy, Folder, Hand, Layers, Lock, Minus, MousePointer2, RotateCcw, RotateCw, Plus, Square, SquareDashed, 
  Trash2, Unlock, X, ChevronUp, ChevronsUp, ChevronsDown,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ShapeType, type ShapeType as ShapeTypeType } from '../engine/types';
import { useStore } from '../store/useStore';
import ToolbarDropdown, { type ToolOption } from './ToolbarDropdown';

type OpenMenu = 'arrange' | 'organize' | null;

const Toolbar = () => {
  const {
    addShape, selectedIds, setSelectedIds, pages, currentPageId, deleteShapes, mode, theme, setMode, undo, redo, history, 
    historyIndex, deleteImage, copy, paste, groupSelectedLayers, ungroupSelectedLayers, toggleLockSelected, moveForward, 
    moveBackward, bringToFront, sendToBack,
  } = useStore();

  const [activeShapeTool, setActiveShapeTool] = useState<ShapeTypeType>(ShapeType.Rectangle);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const arrangeMenuRef = useRef<HTMLDivElement>(null);
  const organizeMenuRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  const currentPage = pages.find((p) => p.id === currentPageId);
  const currentShapes = currentPage?.shapes || [];
  const selectedShapes = currentShapes.filter((shape) => selectedIds.includes(shape.id));
  const hasSelection = selectedIds.length > 0;
  const canGroup = selectedIds.length >= 2;
  const canUngroup = selectedShapes.some((shape) => shape.groupId);
  const allSelectedLocked = hasSelection && selectedShapes.every((shape) => shape.locked);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        arrangeMenuRef.current?.contains(target) ||
        organizeMenuRef.current?.contains(target)
      ) {
        return;
      }
      setOpenMenu(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleSelectAll = () => setSelectedIds(currentShapes.map((s) => s.id));

  const handleDelete = () => {
    if (selectedIds.length === 1 && currentShapes.find((s) => s.id === selectedIds[0])?.type === ShapeType.Image) {
      deleteImage(selectedIds[0]);
      return;
    }
    deleteShapes();
  };

  const shapeOptions: ToolOption[] = [
    { id: ShapeType.Rectangle, label: 'Rectangle', icon: <Square size={17} />, shortcut: 'R', action: () => { setActiveShapeTool(ShapeType.Rectangle); addShape(ShapeType.Rectangle); } },
    { id: ShapeType.Line, label: 'Line', icon: <Minus size={17} />, shortcut: 'L', action: () => { setActiveShapeTool(ShapeType.Line); addShape(ShapeType.Line); } },
    { id: ShapeType.Ellipse, label: 'Ellipse', icon: <Circle size={17} />, shortcut: 'O', action: () => { setActiveShapeTool(ShapeType.Ellipse); addShape(ShapeType.Ellipse); } },
  ];

  const shellClass = isLight
    ? 'bg-white/94 border border-slate-300/80 shadow-[0_18px_34px_rgba(15,23,42,0.14)]'
    : 'fluent-acrylic border border-white/15 shadow-[0_22px_48px_rgba(0,0,0,0.5)]';
  const groupClass = isLight
    ? 'bg-slate-100/85 border border-slate-300/70'
    : 'bg-black/20 border border-white/10';
  const buttonClass = isLight
    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/90'
    : 'text-zinc-400 hover:text-white hover:bg-white/6';
  const mutedClass = isLight ? 'text-slate-400' : 'text-zinc-600';
  const dividerClass = isLight ? 'bg-slate-300/90' : 'bg-white/10';
  const menuClass = isLight
    ? 'bg-white border border-slate-300 shadow-[0_14px_30px_rgba(15,23,42,0.16)]'
    : 'fluent-acrylic border border-white/10 shadow-[0_16px_34px_rgba(0,0,0,0.5)]';
  const menuItemClass = isLight
    ? 'text-slate-700 hover:bg-slate-100'
    : 'text-zinc-300 hover:bg-white/6';

  return (
    <div className={`app-toolbar fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2.5 rounded-2xl z-50 ${shellClass}`}>
      <div className={`flex items-center gap-1 p-1 rounded-xl ${groupClass}`}>
        <button
          onClick={() => setMode('select')}
          className={`p-2 rounded-lg fluent-smooth cursor-pointer ${mode === 'select' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : buttonClass}`}
          title="Select (V)"
        >
          <MousePointer2 size={17} />
        </button>
        <button
          onClick={() => setMode('pan')}
          className={`p-2 rounded-lg fluent-smooth cursor-pointer ${mode === 'pan' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : buttonClass}`}
          title="Hand (H)"
        >
          <Hand size={17} />
        </button>
      </div>

      <div className={`w-px h-7 ${dividerClass}`} />

      <div className={`flex items-center gap-1 p-1 rounded-xl ${groupClass}`}>
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-2 rounded-lg fluent-smooth cursor-pointer ${canUndo ? buttonClass : 'opacity-40 cursor-not-allowed'} `}
          title="Undo (Ctrl/Cmd+Z)"
        >
          <RotateCcw size={17} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-2 rounded-lg fluent-smooth cursor-pointer ${canRedo ? buttonClass : 'opacity-40 cursor-not-allowed'}`}
          title="Redo (Ctrl/Cmd+Shift+Z)"
        >
          <RotateCw size={17} />
        </button>
      </div>

      <div className={`w-px h-7 ${dividerClass}`} />

      <div className={`flex items-center gap-1 p-1 rounded-xl ${groupClass}`}>
        <button
          onClick={handleSelectAll}
          className={`p-2 rounded-lg fluent-smooth cursor-pointer ${buttonClass}`}
          title="Select All (Ctrl/Cmd+A)"
        >
          <SquareDashed size={17} />
        </button>
        <ToolbarDropdown
          options={shapeOptions}
          activeToolId={activeShapeTool}
          theme={theme}
          triggerIcon={<Plus size={17} />}
          triggerTitle="Add Shape"
        />
      </div>

      <div className={`w-px h-7 ${dividerClass}`} />

      <div className={`flex items-center gap-1 p-1 rounded-xl ${groupClass}`}>
        <div className="relative" ref={arrangeMenuRef}>
          <button
            onClick={() => setOpenMenu(openMenu === 'arrange' ? null : 'arrange')}
            disabled={!hasSelection}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg fluent-smooth cursor-pointer ${
              hasSelection ? buttonClass : 'opacity-40 cursor-not-allowed'
            }`}
            title="Arrange Layers"
          >
            <Layers size={16} />
            <ChevronDown size={13} className={mutedClass} />
          </button>

          {openMenu === 'arrange' && hasSelection && (
            <div className={`absolute bottom-full mb-2 left-0 min-w-48 rounded-xl p-1 ${menuClass}`}>
              <button onClick={() => { bringToFront(); setOpenMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm fluent-smooth ${menuItemClass}`}><ChevronsUp size={14} />Bring To Front</button>
              <button onClick={() => { moveForward(); setOpenMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm fluent-smooth ${menuItemClass}`}><ChevronUp size={14} />Move Forward</button>
              <button onClick={() => { moveBackward(); setOpenMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm fluent-smooth ${menuItemClass}`}><ChevronDown size={14} />Move Backward</button>
              <button onClick={() => { sendToBack(); setOpenMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm fluent-smooth ${menuItemClass}`}><ChevronsDown size={14} />Send To Back</button>
            </div>
          )}
        </div>

        <div className="relative" ref={organizeMenuRef}>
          <button
            onClick={() => setOpenMenu(openMenu === 'organize' ? null : 'organize')}
            disabled={!hasSelection}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg fluent-smooth cursor-pointer ${
              hasSelection ? buttonClass : 'opacity-40 cursor-not-allowed'
            }`}
            title="Organize"
          >
            <Folder size={16} />
            <ChevronDown size={13} className={mutedClass} />
          </button>

          {openMenu === 'organize' && hasSelection && (
            <div className={`absolute bottom-full mb-2 left-0 min-w-44 rounded-xl p-1 ${menuClass}`}>
              <button onClick={() => { copy(); paste(); setOpenMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm fluent-smooth ${menuItemClass}`}><Copy size={14} />Duplicate</button>
              <button onClick={() => { groupSelectedLayers(); setOpenMenu(null); }} disabled={!canGroup} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm fluent-smooth ${canGroup ? menuItemClass : 'opacity-40 cursor-not-allowed'}`}><Folder size={14} />Group</button>
              <button onClick={() => { ungroupSelectedLayers(); setOpenMenu(null); }} disabled={!canUngroup} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm fluent-smooth ${canUngroup ? menuItemClass : 'opacity-40 cursor-not-allowed'}`}><X size={14} />Ungroup</button>
              <button onClick={() => { toggleLockSelected(); setOpenMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm fluent-smooth ${menuItemClass}`}>{allSelectedLocked ? <Unlock size={14} /> : <Lock size={14} />}{allSelectedLocked ? 'Unlock' : 'Lock'}</button>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleDelete}
        disabled={!hasSelection}
        className={`ml-1 p-2.5 rounded-xl fluent-smooth cursor-pointer ${
          hasSelection
            ? 'bg-red-600/18 text-red-500 hover:bg-red-600 hover:text-white'
            : 'opacity-40 cursor-not-allowed text-zinc-500'
        }`}
        title="Delete (Del)"
      >
        <Trash2 size={18} />
      </button>

      {selectedIds.length > 1 && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-3 py-1.5 rounded-full font-bold whitespace-nowrap shadow-[0_10px_24px_rgba(37,99,235,0.35)]">
          {selectedIds.length} items
        </div>
      )}
    </div>
  );
};

export default Toolbar;
