'use client';
import { Hand, MousePointer2, Plus, RotateCcw, RotateCw, SquareDashed, Trash2 } from 'lucide-react';
import { ShapeType } from '../engine/types';
import { useStore } from '../store/useStore';

const Toolbar = () => {
  const { addShape, selectedIds, setSelectedIds, pages, currentPageId, deleteShapes, mode, setMode, undo, redo, deleteImage } = useStore();

  // FIX: Derive shapes from the active page so Select All works correctly
  const currentPage = pages.find(p => p.id === currentPageId);
  const currentShapes = currentPage?.shapes || [];

  const handleSelectAll = () => {
    const allIds = currentShapes.map(s => s.id);
    setSelectedIds(allIds);
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-zinc-900/90 border border-zinc-700 rounded-2xl shadow-2xl backdrop-blur-sm z-50">
      {/* Selection Mode Toggles */}
      <div className="flex bg-zinc-800/50 rounded-xl p-1 gap-1">
        <button
          onClick={() => setMode('select')}
          className={`p-2 rounded-lg transition-all cursor-pointer ${mode === 'select' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          title="Select Tool (V)"
        >
          <MousePointer2 size={18} />
        </button>

        <button 
          onClick={() => setMode('pan')}
          className={`p-2 rounded-lg transition-all cursor-pointer ${mode === 'pan' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          title="Hand Tool (H)"
        >
          <Hand size={18} />
        </button>
      </div>

      <div className="w-px h-6 bg-zinc-700 mx-1" />

      {/* History Controls */}
      <div className="flex gap-0.5">
        <button 
          onClick={undo} 
          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw size={18} />
        </button>
        <button 
          onClick={redo} 
          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Redo (Ctrl+Shift+Z)"
        >
          <RotateCw size={18} />
        </button>
      </div>

      <div className="w-px h-6 bg-zinc-700 mx-1" />
      
      {/* Selection Actions */}
      <button 
        onClick={handleSelectAll}
        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
        title="Select All (Ctrl+A)"
      >
        <SquareDashed size={18} />
      </button>

      {/* Add Shape */}
      <button 
        onClick={() => addShape(ShapeType.Rectangle)} 
        className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-all shadow-lg active:scale-95 cursor-pointer"
        title="Add Rectangle (R)"
      >
        <Plus size={20} />
      </button>
      
      {/* Delete Selection */}
      <button 
        onClick={selectedIds.length === 1 && currentShapes.find(s => s.id === selectedIds[0])?.type === ShapeType.Image ? () => deleteImage(selectedIds[0]) : deleteShapes}
        disabled={selectedIds.length === 0}
        className={`p-2 rounded-lg transition-all cursor-pointer ${
          selectedIds.length > 0
            ? 'bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white' 
            : 'text-zinc-700 cursor-not-allowed'
        }`}
        title="Delete Selection (Del)"
      >
        <Trash2 size={20} />
      </button>

      {/* Selection Counter */}
      {selectedIds.length > 1 && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-xl whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
          {selectedIds.length} objects selected
        </div>
      )}
    </div>
  );
};

export default Toolbar;