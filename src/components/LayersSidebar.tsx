import React from 'react';
import {
  Check, ChevronDown, ChevronRight, FileText, Folder, Image as ImageIcon, Layout, Lock, Moon, PanelLeft, Pencil, Plus, Sun, Trash2, 
  Unlock, Upload, X,
} from 'lucide-react';

import type { LayerGroup, Shape } from '../engine/types';

import { useStore } from '../store/useStore';
import {
  ensureLayerTree, parseNodeKey, toNodeKey, type DropPosition, type LayerNodeKey,
} from '../store/layerTree';

import shapeo from '../assets/shapeo.png';

const LayersSidebar = () => {
  const {
    pages, currentPageId, setCurrentPage, addPage, renamePage, selectedIds, setSelectedIds, toggleSelection, leftSidebarVisible, 
    toggleLeftSidebar, addImage, setConfirmDeleteId, setConfirmDeleteGroupId, groupSelectedLayers, ungroupSelectedLayers, renameGroup, 
    moveLayerNode, moveLayerNodeToRootEnd, toggleGroupLock, toggleGroupCollapse, toggleShapeLock, theme, toggleTheme,
  } = useStore();

  const currentPage = pages.find((page) => page.id === currentPageId) ?? null;
  const layerPage = currentPage ? ensureLayerTree(currentPage) : null;
  const currentShapes = layerPage?.shapes ?? [];
  const currentGroups = layerPage?.groups ?? [];
  const rootLayerIds = layerPage?.rootLayerIds ?? [];
  const shapesById = new Map(currentShapes.map((shape) => [shape.id, shape]));
  const groupsById = new Map(currentGroups.map((group) => [group.id, group]));
  const selectedShapeSet = new Set(selectedIds);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editingPageId, setEditingPageId] = React.useState<string | null>(null);
  const [draftPageName, setDraftPageName] = React.useState('');
  const [editingGroupId, setEditingGroupId] = React.useState<string | null>(null);
  const [draftGroupName, setDraftGroupName] = React.useState('');
  const [dragNodeKey, setDragNodeKey] = React.useState<LayerNodeKey | null>(null);
  const [dropTarget, setDropTarget] = React.useState<{
    targetNodeKey: LayerNodeKey;
    position: DropPosition;
  } | null>(null);
  const [rootDropActive, setRootDropActive] = React.useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      addImage(file);
    }
  };

  const selectedShapes = currentShapes.filter((shape) => selectedShapeSet.has(shape.id));
  const canGroup = selectedShapes.length >= 2;
  const canUngroup = selectedShapes.some((shape) => shape.groupId);

  const shapeLabel = (shape: Shape) =>
    shape.name ||
    (shape.type === 'image'
      ? 'Image'
      : shape.type === 'frame'
        ? 'Frame'
      : shape.type === 'rect'
        ? 'Rectangle'
        : shape.type === 'circle'
          ? 'Circle'
          : shape.type === 'ellipse'
            ? 'Ellipse'
            : 'Line');

  const getGroupShapeIds = (groupId: string): string[] => {
    const result: string[] = [];
    const visited = new Set<string>();

    const walk = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const group = groupsById.get(id);
      if (!group) return;
      (group.childIds ?? []).forEach((nodeKey) => {
        const node = parseNodeKey(nodeKey);
        if (node.kind === 'shape') {
          result.push(node.id);
          return;
        }
        walk(node.id);
      });
    };

    walk(groupId);
    return result;
  };

  const handleLayerClick = (event: React.MouseEvent, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      toggleSelection(id);
      return;
    }
    setSelectedIds([id]);
  };

  const startRenamePage = (pageId: string, currentName: string) => {
    setEditingPageId(pageId);
    setDraftPageName(currentName);
  };

  const commitRenamePage = () => {
    if (editingPageId) {
      renamePage(editingPageId, draftPageName);
    }
    setEditingPageId(null);
    setDraftPageName('');
  };

  const cancelRenamePage = () => {
    setEditingPageId(null);
    setDraftPageName('');
  };

  const startRenameGroup = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setDraftGroupName(currentName);
  };

  const commitRenameGroup = () => {
    if (editingGroupId) {
      renameGroup(editingGroupId, draftGroupName);
    }
    setEditingGroupId(null);
    setDraftGroupName('');
  };

  const cancelRenameGroup = () => {
    setEditingGroupId(null);
    setDraftGroupName('');
  };

  const getDropPosition = (
    event: React.DragEvent<HTMLDivElement>,
    allowInside: boolean
  ): DropPosition => {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    if (allowInside && y > rect.height * 0.3 && y < rect.height * 0.7) {
      return 'inside';
    }
    return y < rect.height / 2 ? 'before' : 'after';
  };

  const handleDragStart = (nodeKey: LayerNodeKey) => {
    setDragNodeKey(nodeKey);
  };

  const handleDragOver = (
    event: React.DragEvent<HTMLDivElement>,
    targetNodeKey: LayerNodeKey,
    allowInside: boolean
  ) => {
    if (!dragNodeKey) return;
    event.preventDefault();
    const position = getDropPosition(event, allowInside);
    setDropTarget({ targetNodeKey, position });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!dragNodeKey || !dropTarget) return;
    moveLayerNode(dragNodeKey, dropTarget.targetNodeKey, dropTarget.position);
    setDragNodeKey(null);
    setDropTarget(null);
    setRootDropActive(false);
  };

  const handleDragEnd = () => {
    setDragNodeKey(null);
    setDropTarget(null);
    setRootDropActive(false);
  };

  const handleRootDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!dragNodeKey) return;
    event.preventDefault();
    setRootDropActive(true);
    setDropTarget(null);
  };

  const handleRootDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!dragNodeKey) return;
    moveLayerNodeToRootEnd(dragNodeKey);
    setDragNodeKey(null);
    setDropTarget(null);
    setRootDropActive(false);
  };

  const rowDropClass = (nodeKey: LayerNodeKey) => {
    if (!dropTarget || dropTarget.targetNodeKey !== nodeKey) {
      return '';
    }
    if (dropTarget.position === 'before') {
      return 'ring-1 ring-inset ring-blue-400 border-t border-blue-400';
    }
    if (dropTarget.position === 'after') {
      return 'ring-1 ring-inset ring-blue-400 border-b border-blue-400';
    }
    return 'ring-1 ring-inset ring-blue-400 bg-blue-600/10';
  };

  const renderShapeRow = (shape: Shape, depth: number): React.ReactNode => {
    const nodeKey = toNodeKey('shape', shape.id);
    const isSelected = selectedShapeSet.has(shape.id);
    return (
      <div
        key={nodeKey}
        draggable
        onDragStart={() => handleDragStart(nodeKey)}
        onDragEnd={handleDragEnd}
        onDragOver={(event) => handleDragOver(event, nodeKey, shape.type === 'frame')}
        onDrop={handleDrop}
        onClick={(event) => handleLayerClick(event, shape.id)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer fluent-smooth ${
          isSelected
            ? 'bg-blue-600 text-white fluent-depth-8 fluent-glow-blue'
            : 'ls-row fluent-reveal'
        } ${rowDropClass(nodeKey)}`}
        style={{ marginLeft: depth * 14 }}
      >
        {shape.type === 'image' ? (
          <ImageIcon size={12} className="opacity-70" />
        ) : shape.type === 'line' ? (
          <div className="w-3 h-3 border-b-2 border-current opacity-70 rotate-45" />
        ) : (
          <Layout size={12} className="opacity-70" />
        )}
        <span className="truncate flex-1 text-[11px]">
          {shapeLabel(shape)}
          <span className="ml-1 opacity-40 font-mono text-[9px] uppercase">
            {shape.id.substring(0, 3)}
          </span>
        </span>
        <button
          onClick={(event) => {
            event.stopPropagation();
            toggleShapeLock(shape.id);
          }}
          className={`p-0.5 rounded fluent-smooth ${
            isSelected
              ? 'text-white/90 hover:text-white hover:bg-white/20'
              : 'ls-text-main hover:bg-white/10 hover:text-white'
          }`}
          title={shape.locked ? 'Unlock layer' : 'Lock layer'}
        >
          {shape.locked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
      </div>
    );
  };

  const renderGroupRow = (group: LayerGroup, depth: number): React.ReactNode => {
    const nodeKey = toNodeKey('group', group.id);
    const groupShapeIds = getGroupShapeIds(group.id);
    const groupSelected = groupShapeIds.some((shapeId) => selectedShapeSet.has(shapeId));
    const groupAllLocked =
      groupShapeIds.length > 0 &&
      groupShapeIds.every((shapeId) => shapesById.get(shapeId)?.locked);
    const childIds = group.childIds ?? [];

    return (
      <div key={nodeKey} className="flex flex-col gap-0.5">
        <div
          draggable
          onDragStart={() => handleDragStart(nodeKey)}
          onDragEnd={handleDragEnd}
          onDragOver={(event) => handleDragOver(event, nodeKey, true)}
          onDrop={handleDrop}
          className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer fluent-smooth ${
            groupSelected
              ? 'bg-blue-600/20 text-blue-300'
              : 'ls-row'
          } ${rowDropClass(nodeKey)}`}
          style={{ marginLeft: depth * 14 }}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedIds(groupShapeIds);
          }}
        >
          <button
            onClick={(event) => {
              event.stopPropagation();
              toggleGroupCollapse(group.id);
            }}
            className="p-0.5 rounded hover:bg-white/10 fluent-smooth"
            title={group.collapsed ? 'Expand group' : 'Collapse group'}
          >
            {group.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
          <Folder size={12} className="opacity-80" />
          {editingGroupId === group.id ? (
            <input
              className="bg-transparent text-[11px] w-full outline-none"
              autoFocus
              value={draftGroupName}
              onChange={(event) => setDraftGroupName(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              onBlur={commitRenameGroup}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitRenameGroup();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelRenameGroup();
                }
              }}
            />
          ) : (
            <>
              <span className="truncate flex-1 text-[11px] font-medium">{group.name}</span>
              <span className="text-[9px] opacity-60">{groupShapeIds.length}</span>
            </>
          )}
          {editingGroupId === group.id ? (
            <div className="flex items-center gap-1">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  commitRenameGroup();
                }}
                className="p-0.5 text-emerald-400 hover:text-emerald-300 fluent-smooth"
                title="Save group name"
              >
                <Check size={11} />
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  cancelRenameGroup();
                }}
                className="p-0.5 ls-text-dim hover:text-white fluent-smooth"
                title="Cancel rename"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  toggleGroupLock(group.id);
                }}
                className="p-0.5 ls-text-dim hover:text-white fluent-smooth"
                title={groupAllLocked ? 'Unlock group' : 'Lock group'}
              >
                {groupAllLocked ? <Lock size={11} /> : <Unlock size={11} />}
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  startRenameGroup(group.id, group.name);
                }}
                className="p-0.5 ls-text-dim hover:text-white fluent-smooth"
                title="Rename group"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmDeleteGroupId(group.id);
                }}
                className="p-0.5 ls-text-dim hover:text-red-400 fluent-smooth"
                title="Delete group"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>
        {!group.collapsed && renderNodeList(childIds, depth + 1)}
      </div>
    );
  };

  const renderNodeList = (nodeIds: LayerNodeKey[], depth: number): React.ReactNode => (
    <div className="flex flex-col gap-0.5">
      {[...nodeIds].reverse().map((nodeKey) => {
        const parsed = parseNodeKey(nodeKey);
        if (parsed.kind === 'shape') {
          const shape = shapesById.get(parsed.id);
          return shape ? renderShapeRow(shape, depth) : null;
        }
        const group = groupsById.get(parsed.id);
        return group ? renderGroupRow(group, depth) : null;
      })}
    </div>
  );

  if (!leftSidebarVisible) {
    return (
      <div
        className="fixed top-4 left-4 w-10 h-10 rounded-lg flex items-center justify-center z-50 cursor-pointer fluent-depth-16 fluent-smooth fluent-reveal border ls-divider ls-row"
        onClick={toggleLeftSidebar}
      >
        <PanelLeft size={16} className="ls-title" />
      </div>
    );
  }

  return (
    <div className="layers-sidebar fixed top-4 left-4 w-64 h-[calc(100dvh-32px)] rounded-xl fluent-acrylic premium-panel flex flex-col z-50 select-none overflow-hidden fluent-animate-slide">
      <div className="p-3.5 premium-header flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black italic">
            <img src={shapeo} alt="Shapeo" loading="lazy" />
          </div>
          <span className="ls-title text-[11px] font-bold tracking-tight">SHAPEO</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="ls-icon-btn p-1 rounded fluent-smooth fluent-reveal"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={toggleLeftSidebar}
            className="ls-icon-btn p-1 rounded fluent-smooth fluent-reveal"
          >
            <PanelLeft size={16} />
          </button>
        </div>
      </div>

      <div className="px-2 py-4 border-b ls-divider">
        <div className="flex justify-between items-center mb-2 px-2 ls-text-muted">
          <span className="ls-title text-[10px] font-bold uppercase tracking-widest">Pages</span>
          <button
            onClick={addPage}
            className="ls-icon-btn p-1 rounded fluent-smooth fluent-reveal"
          >
            <Plus size={14} />
          </button>
        </div>
        {pages.map((page) => (
          <div key={page.id} className="group flex items-center justify-between gap-1">
            <div
              onClick={() => setCurrentPage(page.id)}
              className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer fluent-smooth ${
                currentPageId === page.id
                  ? 'bg-blue-600/10 text-blue-400 fluent-reveal'
                  : 'ls-row fluent-reveal'
              }`}
            >
              <FileText size={12} />
              {editingPageId === page.id ? (
                <input
                  className="bg-transparent text-[11px] w-full outline-none"
                  autoFocus
                  value={draftPageName}
                  onChange={(event) => setDraftPageName(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={commitRenamePage}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitRenamePage();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelRenamePage();
                    }
                  }}
                />
              ) : (
                <span className="truncate flex-1">{page.name}</span>
              )}
            </div>
            {editingPageId === page.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    commitRenamePage();
                  }}
                  className="p-1 text-emerald-400 hover:text-emerald-300 fluent-smooth"
                  title="Save page name"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    cancelRenamePage();
                  }}
                  className="p-1 ls-text-dim hover:text-white fluent-smooth"
                  title="Cancel rename"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  startRenamePage(page.id, page.name);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 ls-text-dim hover:text-white fluent-smooth fluent-reveal"
                title="Rename page"
              >
                <Pencil size={12} />
              </button>
            )}
            {pages.length > 1 && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmDeleteId(page.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 ls-text-dim hover:text-red-400 fluent-smooth fluent-reveal"
                title="Delete page"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 ls-text-muted">
          <span className="ls-title text-[10px] font-bold uppercase tracking-widest">Layers</span>
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="ls-icon-btn p-1 rounded fluent-smooth fluent-reveal"
              title="Upload Image"
            >
              <Upload size={14} />
            </button>
            <button
              onClick={groupSelectedLayers}
              disabled={!canGroup}
              className="ls-icon-btn p-1 rounded fluent-smooth"
              title="Group selected layers"
            >
              <Folder size={14} />
            </button>
            <button
              onClick={ungroupSelectedLayers}
              disabled={!canUngroup}
              className="ls-icon-btn p-1 rounded fluent-smooth"
              title="Ungroup selected layers"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div
          className={`flex-1 px-2 pb-4 overflow-y-auto fluent-scrollbar ${
            rootDropActive ? 'ring-1 ring-blue-400/60 rounded-md bg-blue-500/5' : ''
          }`}
          onDragOver={handleRootDragOver}
          onDrop={handleRootDrop}
          onDragLeave={() => setRootDropActive(false)}
        >
          {currentShapes.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed ls-divider rounded-lg mx-2 opacity-30 ls-text-muted">
              <Layout size={24} />
              <span className="text-[9px] mt-2 font-bold uppercase">Empty Page</span>
            </div>
          ) : (
            renderNodeList(rootLayerIds, 0)
          )}
        </div>
      </div>
    </div>
  );
};

export default LayersSidebar;
