import { MapCanvas } from './components/MapCanvas'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { useMapState } from './hooks/useMapState'
import './App.css'

export default function App() {
  const state = useMapState()

  return (
    <div className="app">
      <Sidebar
        library={state.library}
        onAdd={state.addPieceFromLibrary}
      />
      <div className="main">
        <Toolbar
          map={state.map}
          showGrid={state.ui.showGrid}
          deployment={state.deployment}
          hasSelection={state.selectedIds.length > 0}
          hasPieces={state.pieces.length > 0}
          onPreset={state.applyPreset}
          onMapSize={state.setMapSize}
          onBorderBuffer={state.setBorderBuffer}
          onToggleGrid={state.toggleGrid}
          onToggleDeployment={state.toggleDeployment}
          onDeploymentAxis={state.setDeploymentAxis}
          onRandomize={state.randomizeAll}
          onClearAll={state.clearAll}
          onRotate90={state.rotateSelected90}
          onFreeRotate={state.freeRotateSelected}
          onToggleLock={state.toggleLockSelected}
          onDelete={state.deleteSelected}
        />
        {state.statusMsg && (
          <div className="status-bar" role="status">
            <span>{state.statusMsg}</span>
            <button type="button" onClick={state.clearStatus}>
              닫기
            </button>
          </div>
        )}
        <MapCanvas
          map={state.map}
          library={state.library}
          pieces={state.pieces}
          selectedIds={state.selectedIds}
          showGrid={state.ui.showGrid}
          deployment={state.deployment}
          onSelect={state.selectPiece}
          onMove={state.movePiece}
          onRotatePiece={state.setPieceRotation}
          onDeploymentDepth={state.setDeploymentDepth}
        />
      </div>
    </div>
  )
}
