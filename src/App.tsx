import { useState } from "react";
import battleTableImage from "./assets/battle-table-hobby.svg";
import { MapCanvas } from "./components/MapCanvas";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { useMapState } from "./hooks/useMapState";
import "./App.css";

export default function App() {
  const state = useMapState();
  const [helpOpen, setHelpOpen] = useState(false);
  const [largeMapOpen, setLargeMapOpen] = useState(false);

  const openHelp = () => {
    setHelpOpen(true);
  };

  const mapCanvas = (interactive: boolean) => (
    <MapCanvas
      map={state.map}
      library={state.library}
      pieces={state.pieces}
      selectedIds={state.selectedIds}
      showGrid={state.ui.showGrid}
      deployment={state.deployment}
      interactive={interactive}
      onSelect={state.selectPiece}
      onMove={state.movePiece}
      onRotatePiece={state.setPieceRotation}
    />
  );

  return (
    <div className="app">
      <Sidebar
        library={state.library}
        onPlace={state.addPieceFromLibrary}
        onUpdatePiece={state.updateLibraryPiece}
        onAddPiece={state.addLibraryPiece}
        onRemovePiece={state.removeLibraryPiece}
        onExport={state.exportLibrary}
        onImport={state.importLibrary}
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
          onDeploymentDepth={state.setDeploymentDepth}
          onDeploymentAxis={state.setDeploymentAxis}
          onRandomize={state.randomizeAll}
          onRandomRotate={state.randomRotateUnlocked}
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
        {mapCanvas(true)}
        <div className="map-actions">
          <button type="button" onClick={() => setLargeMapOpen(true)}>
            맵 크게 보기
          </button>
          <button
            type="button"
            className="help-button"
            aria-label="후원자 정보"
            title="후원자 정보"
            onClick={openHelp}
          >
            ?
          </button>
        </div>
      </div>

      {largeMapOpen && (
        <div
          className="modal-backdrop large-map-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLargeMapOpen(false);
          }}
        >
          <section
            className="large-map-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="large-map-title"
          >
            <div className="sponsor-modal-heading">
              <h2 id="large-map-title">맵 크게 보기</h2>
              <button
                type="button"
                className="modal-close-button"
                aria-label="닫기"
                onClick={() => setLargeMapOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="large-map-view">{mapCanvas(false)}</div>
          </section>
        </div>
      )}

      {helpOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setHelpOpen(false);
          }}
        >
          <section
            className="sponsor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sponsor-title"
          >
            <div className="sponsor-modal-heading">
              <h2 id="sponsor-title">후원</h2>
              <button
                type="button"
                className="modal-close-button"
                aria-label="닫기"
                onClick={() => setHelpOpen(false)}
              >
                ×
              </button>
            </div>
            <img
              className="sponsor-image"
              src={battleTableImage}
              alt="Battle Table Hobby 로고"
            />
            <h3>게임 카톡방</h3>
            <ul>
              <li>
                <a
                  href="https://open.kakao.com/o/gOf9bsLi"
                  target="_blank"
                  rel="noreferrer"
                >
                  인피니티 톡방 링크
                </a>
              </li>
              <li>
                <a
                  href="https://open.kakao.com/o/g5fGMLIi"
                  target="_blank"
                  rel="noreferrer"
                >
                  블랙아웃 공식 톡방 링크
                </a>
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
