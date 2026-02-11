import Canvas from './components/Canvas';
import DeletePageModal from './components/DeletePageModal';
import LayersSidebar from './components/LayersSidebar';
import PropertySidebar from './components/PropertySidebar';
import Toolbar from './components/Toolbar';

import { useKeyboard } from './hooks/useKeyboard';

function App() {
  useKeyboard();
  return (
    <div className="relative w-screen h-screen overflow-hidden flex">
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
    </div>
  )
}

export default App;
