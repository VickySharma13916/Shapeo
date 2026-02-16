'use client';
import {
  ArrowRight, ChevronDown, Circle, Copy, Folder, Hand, Layers, Lock, Minus, MousePointer2, PenTool, Repeat2, RotateCcw, RotateCw, Plus, SlidersHorizontal, Square, SquareDashed, 
  Trash2, Unlock, X, ChevronUp, ChevronsUp, ChevronsDown,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ShapeType, type ShapeType as ShapeTypeType } from '../engine/types';
import { useStore } from '../store/useStore';
import ToolbarDropdown, { type ToolOption } from './ToolbarDropdown';

type OpenMenu = 'arrange' | 'organize' | null;
type DrawToolId = 'pen' | 'line' | 'arrow';

const Toolbar = () => {
  const {
    addShape, selectedIds, setSelectedIds, pages, currentPageId, deleteShapes, mode, theme, setMode, undo, redo, history, 
    historyIndex, deleteImage, copy, paste, groupSelectedLayers, ungroupSelectedLayers, toggleLockSelected, moveForward, 
    moveBackward, bringToFront, sendToBack, createFrameFromSelection, moveSelectionIntoFrame, removeSelectionFromFrame,
    drawSettings, toggleKeepDrawing, adjustDrawStroke, setDrawStrokeColor, adjustPencilSmoothing, adjustPencilSimplify, cycleArrowHeadStyle, toggleArrowDashed,
  } = useStore();

  const [activeShapeTool, setActiveShapeTool] = useState<ShapeTypeType>(ShapeType.Rectangle);
  const [activeDrawTool, setActiveDrawTool] = useState<DrawToolId>('pen');
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const arrangeMenuRef = useRef<HTMLDivElement>(null);
  const organizeMenuRef = useRef<HTMLDivElement>(null);

  const currentPage = pages.find((p) => p.id === currentPageId);
  const currentShapes = currentPage?.shapes || [];
  const selectedShapes = currentShapes.filter((shape) => selectedIds.includes(shape.id));
  const hasSelection = selectedIds.length > 0;
  const canGroup = selectedIds.length >= 2;
  const canUngroup = selectedShapes.some((shape) => shape.groupId);
  const allSelectedLocked = hasSelection && selectedShapes.every((shape) => shape.locked);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const selectedFrames = selectedShapes.filter((shape) => shape.type === ShapeType.Frame);
  const selectedFrameId = selectedFrames.length === 1 ? selectedFrames[0].id : null;
  const canMoveIntoFrame = Boolean(selectedFrameId && selectedShapes.some((shape) => shape.id !== selectedFrameId && !shape.locked));
  const canRemoveFromFrame = selectedShapes.some((shape) => !shape.locked && shape.frameId);

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
    { id: ShapeType.Frame, label: 'Frame', icon: <Square size={17} />, shortcut: 'F', action: () => { setActiveShapeTool(ShapeType.Frame); addShape(ShapeType.Frame); } },
    { id: ShapeType.Ellipse, label: 'Ellipse', icon: <Circle size={17} />, shortcut: 'O', action: () => { setActiveShapeTool(ShapeType.Ellipse); addShape(ShapeType.Ellipse); } },
  ];
  const drawToolOptions: ToolOption[] = [
    { id: 'pen', label: 'Pencil', icon: <PenTool size={17} />, shortcut: 'P', action: () => { setActiveDrawTool('pen'); setMode('pen'); } },
    { id: 'line', label: 'Line', icon: <Minus size={17} />, shortcut: 'L', action: () => { setActiveDrawTool('line'); setMode('line'); } },
    { id: 'arrow', label: 'Arrow', icon: <ArrowRight size={17} />, shortcut: 'A', action: () => { setActiveDrawTool('arrow'); setMode('arrow'); } },
  ];
  const currentDrawToolId: DrawToolId =
    mode === 'pen' || mode === 'line' || mode === 'arrow'
      ? mode
      : activeDrawTool;
  const activeDrawStroke = drawSettings.strokeByTool[currentDrawToolId];

  return (
    <div className="app-toolbar tb-shell fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2.5 rounded-2xl z-50 border fluent-acrylic">
      <div className="tb-group flex items-center gap-1 p-1 rounded-xl">
        <button
          onClick={() => setMode('select')}
          className={`tb-button p-2 rounded-lg fluent-smooth cursor-pointer ${mode === 'select' ? 'tb-button-active' : ''}`}
          title="Select (V)"
        >
          <MousePointer2 size={17} />
        </button>
        <button
          onClick={() => setMode('pan')}
          className={`tb-button p-2 rounded-lg fluent-smooth cursor-pointer ${mode === 'pan' ? 'tb-button-active' : ''}`}
          title="Hand (H)"
        >
          <Hand size={17} />
        </button>
        <ToolbarDropdown
          options={drawToolOptions}
          activeToolId={currentDrawToolId}
          theme={theme}
          triggerTitle="Draw Tools"
          className={mode === 'pen' || mode === 'line' || mode === 'arrow' ? 'tb-button-active rounded-lg' : ''}
        />
      </div>

      <div className="tb-divider w-px h-7" />

      <div className="tb-group flex items-center gap-1 p-1 rounded-xl">
        <button
          onClick={toggleKeepDrawing}
          className={`tb-button p-2 rounded-lg fluent-smooth cursor-pointer ${drawSettings.keepDrawing ? 'tb-button-active' : ''}`}
          title={drawSettings.keepDrawing ? 'Keep Drawing: ON' : 'Keep Drawing: OFF'}
        >
          <Repeat2 size={16} />
        </button>
        <button
          onClick={() => adjustDrawStroke(currentDrawToolId, -1)}
          className="tb-button p-2 rounded-lg fluent-smooth cursor-pointer"
          title="Decrease Draw Stroke"
        >
          <Minus size={15} />
        </button>
        <div className="tb-button px-2 py-1.5 rounded-lg text-[11px] font-mono flex justify-center items-center">
          {activeDrawStroke}
        </div>
        <button
          onClick={() => adjustDrawStroke(currentDrawToolId, 1)}
          className="tb-button p-2 rounded-lg fluent-smooth cursor-pointer"
          title="Increase Draw Stroke"
        >
          <Plus size={15} />
        </button>
        <input
          type="color"
          value={drawSettings.strokeColorByTool[currentDrawToolId]}
          onChange={(event) => setDrawStrokeColor(currentDrawToolId, event.target.value)}
          className="tb-button w-8 h-8 p-1 rounded-lg cursor-pointer"
          title="Draw Stroke Color"
        />
        <div className="relative group">
          <button
            className="tb-button p-2 rounded-lg fluent-smooth cursor-pointer"
            title="Advanced Draw Settings"
          >
            <SlidersHorizontal size={15} />
          </button>
          <div className="tb-menu absolute bottom-full mb-2 left-0 min-w-52 rounded-xl p-2 z-50 invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-150">
            {currentDrawToolId === 'pen' && (
              <div className="space-y-2 text-[11px] font-semibold">
                <div className="flex items-center justify-between gap-2">
                  <span className="tb-icon-dim">Smoothing</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => adjustPencilSmoothing(-0.05)} className="tb-button px-2 py-1 rounded-md">-</button>
                    <span className="w-10 text-center font-mono">{drawSettings.pencilSmoothing.toFixed(2)}</span>
                    <button onClick={() => adjustPencilSmoothing(0.05)} className="tb-button px-2 py-1 rounded-md">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="tb-icon-dim">Simplify</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => adjustPencilSimplify(-0.15)} className="tb-button px-2 py-1 rounded-md">-</button>
                    <span className="w-10 text-center font-mono">{drawSettings.pencilSimplify.toFixed(2)}</span>
                    <button onClick={() => adjustPencilSimplify(0.15)} className="tb-button px-2 py-1 rounded-md">+</button>
                  </div>
                </div>
              </div>
            )}
            {currentDrawToolId === 'arrow' && (
              <div className="space-y-2 text-[11px] font-semibold">
                <button
                  onClick={cycleArrowHeadStyle}
                  className="tb-menu-item w-full flex items-center justify-between px-2 py-2 rounded-lg"
                >
                  <span>Head</span>
                  <span className="uppercase font-mono">{drawSettings.arrowHeadStyle}</span>
                </button>
                <button
                  onClick={toggleArrowDashed}
                  className={`tb-menu-item w-full flex items-center justify-between px-2 py-2 rounded-lg ${drawSettings.arrowDashed ? 'text-blue-500' : ''}`}
                >
                  <span>Dashed</span>
                  <span className="font-mono">{drawSettings.arrowDashed ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            )}
            {currentDrawToolId === 'line' && (
              <div className="text-[11px] font-semibold tb-icon-dim px-1 py-1.5">
                Line uses stroke + color controls.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tb-divider w-px h-7" />

      <div className="tb-group flex items-center gap-1 p-1 rounded-xl">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="tb-button p-2 rounded-lg fluent-smooth cursor-pointer"
          title="Undo (Ctrl/Cmd+Z)"
        >
          <RotateCcw size={17} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="tb-button p-2 rounded-lg fluent-smooth cursor-pointer"
          title="Redo (Ctrl/Cmd+Shift+Z)"
        >
          <RotateCw size={17} />
        </button>
      </div>

      <div className="tb-divider w-px h-7" />

      <div className="tb-group flex items-center gap-1 p-1 rounded-xl">
        <button
          onClick={handleSelectAll}
          className="tb-button p-2 rounded-lg fluent-smooth cursor-pointer"
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

      <div className="tb-divider w-px h-7" />

      <div className="tb-group flex items-center gap-1 p-1 rounded-xl">
        <div className="relative" ref={arrangeMenuRef}>
          <button
            onClick={() => setOpenMenu(openMenu === 'arrange' ? null : 'arrange')}
            disabled={!hasSelection}
            className="tb-button flex items-center gap-1.5 px-2.5 py-2 rounded-lg fluent-smooth cursor-pointer"
            title="Arrange Layers"
          >
            <Layers size={16} />
            <ChevronDown size={13} className="tb-icon-dim" />
          </button>

          {openMenu === 'arrange' && hasSelection && (
            <div className="tb-menu absolute bottom-full mb-2 left-0 min-w-48 rounded-xl p-1">
              <button onClick={() => { bringToFront(); setOpenMenu(null); }} className="tb-menu-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fluent-smooth"><ChevronsUp size={14} />Bring To Front</button>
              <button onClick={() => { moveForward(); setOpenMenu(null); }} className="tb-menu-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fluent-smooth"><ChevronUp size={14} />Move Forward</button>
              <button onClick={() => { moveBackward(); setOpenMenu(null); }} className="tb-menu-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fluent-smooth"><ChevronDown size={14} />Move Backward</button>
              <button onClick={() => { sendToBack(); setOpenMenu(null); }} className="tb-menu-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fluent-smooth"><ChevronsDown size={14} />Send To Back</button>
            </div>
          )}
        </div>

        <div className="relative" ref={organizeMenuRef}>
          <button
            onClick={() => setOpenMenu(openMenu === 'organize' ? null : 'organize')}
            disabled={!hasSelection}
            className="tb-button flex items-center gap-1.5 px-2.5 py-2 rounded-lg fluent-smooth cursor-pointer"
            title="Organize"
          >
            <Folder size={16} />
            <ChevronDown size={13} className="tb-icon-dim" />
          </button>

          {openMenu === 'organize' && hasSelection && (
            <div className="tb-menu absolute bottom-full mb-2 left-0 min-w-44 rounded-xl p-1">
              <button onClick={() => { copy(); paste(); setOpenMenu(null); }} className="tb-menu-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fluent-smooth"><Copy size={14} />Duplicate</button>
              <button onClick={() => { createFrameFromSelection(); setOpenMenu(null); }} className="tb-menu-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fluent-smooth"><Square size={14} />Frame Selection</button>
              <button onClick={() => { groupSelectedLayers(); setOpenMenu(null); }} disabled={!canGroup} className="tb-menu-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fluent-smooth"><Folder size={14} />Group</button>
              <button onClick={() => { ungroupSelectedLayers(); setOpenMenu(null); }} disabled={!canUngroup} className="tb-menu-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fluent-smooth"><X size={14} />Ungroup</button>
              <button
                onClick={() => {
                  if (selectedFrameId) moveSelectionIntoFrame(selectedFrameId);
                  setOpenMenu(null);
                }}
                disabled={!canMoveIntoFrame}
                className="tb-menu-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fluent-smooth"
              >
                <Square size={14} />
                Move Into Frame
              </button>
              <button
                onClick={() => { removeSelectionFromFrame(); setOpenMenu(null); }}
                disabled={!canRemoveFromFrame}
                className="tb-menu-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fluent-smooth"
              >
                <X size={14} />
                Remove From Frame
              </button>
              <button onClick={() => { toggleLockSelected(); setOpenMenu(null); }} className="tb-menu-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold fluent-smooth">{allSelectedLocked ? <Unlock size={14} /> : <Lock size={14} />}{allSelectedLocked ? 'Unlock' : 'Lock'}</button>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleDelete}
        disabled={!hasSelection}
        className="tb-button tb-danger-btn ml-1 p-2.5 rounded-xl fluent-smooth cursor-pointer"
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
