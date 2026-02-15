import Canvas from './components/Canvas';
import DeleteGroupModal from './components/DeleteGroupModal';
import DeletePageModal from './components/DeletePageModal';
import LayersSidebar from './components/LayersSidebar';
import PropertySidebar from './components/PropertySidebar';
import Toolbar from './components/Toolbar';

import { useStore } from './store/useStore';

import { useKeyboard } from './hooks/useKeyboard';

function App() {
  useKeyboard();
  const { theme } = useStore();
  const isLight = theme === 'light';
  return (
    <div className={`theme-${theme} relative w-screen h-screen overflow-hidden flex app-shell`}>
      <div className={`absolute inset-0 pointer-events-none ${
        isLight
          ? 'bg-[radial-gradient(1200px_700px_at_20%_-10%,rgba(59,130,246,0.10),transparent_60%),radial-gradient(900px_600px_at_90%_110%,rgba(16,185,129,0.08),transparent_65%)]'
          : 'bg-[radial-gradient(1200px_700px_at_20%_-10%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(900px_600px_at_90%_110%,rgba(16,185,129,0.12),transparent_65%)]'
      }`} />
      <div className={`absolute inset-0 pointer-events-none bg-size-[24px_24px] ${
        isLight
          ? 'opacity-40 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)]'
          : 'opacity-25 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]'
      }`} />
      {/* Left Sidebar - Layers & Pages */}
      <LayersSidebar />
      
      {/* Main Container - Canvas must take remaining space */}
      <div className="flex-1 relative h-full">
        <Canvas />
      </div>

      {/* Right Sidebar - Properties */}
      <PropertySidebar />
      
      {/* Toolbar - Fixed at bottom */}
      <Toolbar />
      
      <DeletePageModal />
      <DeleteGroupModal />
    </div>
  )
}

export default App;
