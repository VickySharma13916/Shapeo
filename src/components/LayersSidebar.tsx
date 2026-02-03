import React from 'react';
import { Plus, PanelLeft, Layout, Upload, Image as ImageIcon, FileText, Trash2 } from 'lucide-react';

import { useStore } from '../store/useStore';

import shapeo from "../assets/shapeo.png";

const LayersSidebar = () => {
  const { 
    pages, currentPageId, setCurrentPage, addPage, selectedIds, setSelectedIds, leftSidebarVisible, toggleLeftSidebar, addImage, setConfirmDeleteId
  } = useStore();

  const currentPage = pages.find(p => p.id === currentPageId);
  const currentShapes = currentPage?.shapes || [];
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) addImage(file);
  };

  if (!leftSidebarVisible) {
    return (
      <div className="fixed top-4 left-4 w-12 h-12 rounded-xl bg-[#2c2c2c]/90 backdrop-blur-md border border-[#444444] flex items-center justify-center z-50 cursor-pointer shadow-xl hover:bg-[#363636] transition-all"
           onClick={toggleLeftSidebar}>
        <PanelLeft size={20} className="text-white" />
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-4 w-64 h-[calc(100dvh-32px)] rounded-xl bg-[#2c2c2c] border border-[#444444] flex flex-col z-50 select-none shadow-2xl overflow-hidden animate-in slide-in-from-left-4 duration-200">
      
      {/* HEADER */}
      <div className="p-3.5 border-b border-[#444444] flex justify-between items-center bg-[#242424]/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black italic">
            <img src={shapeo} alt="Shapeo" loading='lazy' />
          </div>
          <span className="text-[11px] text-white font-bold tracking-tight">SHAPEO</span>
        </div>
        <button onClick={toggleLeftSidebar} className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded transition-all">
          <PanelLeft size={16} className="rotate-180" />
        </button>
      </div>

      {/* PAGES SECTION */}
      <div className="px-2 py-4 border-b border-[#444444]">
        <div className="flex justify-between items-center mb-2 px-2 text-zinc-500">
          <span className="text-[10px] font-bold uppercase tracking-widest">Pages</span>
          <button onClick={addPage} className="p-1 hover:bg-zinc-800 rounded hover:text-white transition-all">
            <Plus size={14}/>
          </button>
        </div>
        {/* PAGES LIST */}
        {pages.map(page => (
          <div key={page.id} className="group flex items-center justify-between gap-1">
            <div 
              onClick={() => setCurrentPage(page.id)}
              className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer ${
                currentPageId === page.id ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-400'
              }`}
            >
              <FileText size={12} />
              {page.name}
            </div>
            {/* Show delete button only if more than 1 page exists */}
            {pages.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteId(page.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>


      {/* LAYERS SECTION */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 text-zinc-500">
          <span className="text-[10px] font-bold uppercase tracking-widest">Layers</span>
          <div className="flex items-center gap-1">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <button onClick={() => fileInputRef.current?.click()} className="p-1 hover:bg-zinc-800 rounded hover:text-white transition-all" title="Upload Image">
              <Upload size={14}/>
            </button>
          </div>
        </div>

        <div className="flex-1 px-2 pb-4 overflow-y-auto scrollbar-hide">
          {currentShapes.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-lg mx-2 opacity-20">
              <Layout size={24} />
              <span className="text-[9px] mt-2 font-bold uppercase">Empty Page</span>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {[...currentShapes].reverse().map(shape => (
                <div key={shape.id} onClick={() => setSelectedIds([shape.id])}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all ${
                    selectedIds.includes(shape.id) ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}>
                  {shape.type === 'image' ? <ImageIcon size={12} className="opacity-70" /> : <Layout size={12} className="opacity-70" />}
                  <span className="truncate flex-1">
                    {shape.type === 'image' ? 'Image' : shape.type === 'rect' ? 'Rectangle' : 'Circle'}
                    <span className="ml-1 opacity-40 font-mono text-[10px]">{shape.id.substring(0,3)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayersSidebar;