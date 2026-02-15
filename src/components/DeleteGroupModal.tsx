import { AlertCircle } from 'lucide-react';

import { useStore } from '../store/useStore';

const DeleteGroupModal = () => {
  const { confirmDeleteGroupId, setConfirmDeleteGroupId, deleteGroup, pages, currentPageId } = useStore();

  if (!confirmDeleteGroupId) return null;

  const currentPage = pages.find((page) => page.id === currentPageId);
  const group = currentPage?.groups?.find((entry) => entry.id === confirmDeleteGroupId);
  const groupName = group?.name ?? 'this group';

  return (
    <div className="fixed inset-0 fluent-backdrop z-9999 flex items-center justify-center p-4">
      <div className="fluent-acrylic border border-red-500/30 p-6 rounded-2xl fluent-depth-64 w-full max-w-85 fluent-animate-in">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4 fluent-glow-subtle">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-2">
            Delete Group?
          </h3>
          <p className="text-[11px] text-zinc-400 leading-relaxed mb-6">
            Deleting <span className="text-zinc-200 font-semibold">{groupName}</span> will remove
            all nested groups and layers inside it.
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setConfirmDeleteGroupId(null)}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 fluent-smooth cursor-pointer fluent-reveal"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                deleteGroup(confirmDeleteGroupId);
                setConfirmDeleteGroupId(null);
              }}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-500 fluent-smooth fluent-depth-8 cursor-pointer fluent-reveal"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteGroupModal;
