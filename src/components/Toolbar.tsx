import type { DeploymentZone, MapConfig } from '../types/terrain'
import { FlexibleNumberInput } from './FlexibleNumberInput'

interface ToolbarProps {
  map: MapConfig
  showGrid: boolean
  deployment: DeploymentZone
  hasSelection: boolean
  hasPieces: boolean
  collapsed: boolean
  onToggleCollapse: () => void
  onPreset: (sizeFt: 3 | 4) => void
  onMapSize: (widthIn: number, heightIn: number) => void
  onBorderBuffer: (inches: number) => void
  onToggleGrid: () => void
  onToggleDeployment: () => void
  onDeploymentDepth: (depthIn: number) => void
  onDeploymentAxis: (axis: DeploymentZone['axis']) => void
  onRandomize: () => void
  onRandomRotate: () => void
  onClearAll: () => void
  onRotate90: () => void
  onFreeRotate: () => void
  onToggleLock: () => void
  onDelete: () => void
}

export function Toolbar({
  map, showGrid, deployment, hasSelection, hasPieces, collapsed, onToggleCollapse, onPreset, onMapSize,
  onBorderBuffer, onToggleGrid, onToggleDeployment, onDeploymentDepth,
  onDeploymentAxis, onRandomize, onRandomRotate, onClearAll, onRotate90,
  onFreeRotate, onToggleLock, onDelete,
}: ToolbarProps) {
  return (
    <header className={collapsed ? "toolbar toolbar-collapsed" : "toolbar"}>
  <button type="button" className="mobile-panel-toggle" aria-expanded={!collapsed} onClick={onToggleCollapse}>{collapsed ? "옵션 펼치기" : "옵션 접기"}</button>
      <div className="toolbar-group">
        <span className="toolbar-label">맵</span>
        <button type="button" onClick={() => onPreset(3)}>3×3피트</button>
        <button type="button" onClick={() => onPreset(4)}>4×4피트</button>
        <label>가로<FlexibleNumberInput value={map.widthIn} min={12} onChange={(v) => v !== null && onMapSize(v, map.heightIn)} />″</label>
        <label>세로<FlexibleNumberInput value={map.heightIn} min={12} onChange={(v) => v !== null && onMapSize(map.widthIn, v)} />″</label>
        <label>테두리<FlexibleNumberInput value={map.borderBufferIn} min={0} step={0.5} onChange={(v) => v !== null && onBorderBuffer(v)} />″</label>
      </div>
      <div className="toolbar-group">
        <span className="toolbar-label">오버레이</span>
        <button type="button" className={showGrid ? 'is-active' : undefined} onClick={onToggleGrid}>격자 12″</button>
        <button type="button" className={deployment.visible ? 'is-active' : undefined} onClick={onToggleDeployment}>배치구역</button>
        <select value={deployment.axis} onChange={(e) => onDeploymentAxis(e.target.value as DeploymentZone['axis'])} aria-label="배치구역 방향">
          <option value="NS">위 / 아래</option><option value="EW">좌 / 우</option>
        </select>
        <label>깊이<FlexibleNumberInput value={deployment.depthIn} min={1} max={(deployment.axis === 'NS' ? map.heightIn : map.widthIn) / 2 - 1} step={0.5} onChange={(v) => v !== null && onDeploymentDepth(v)} />″</label>
      </div>
      <div className="toolbar-group">
        <span className="toolbar-label">배치</span>
        <button type="button" className="btn-primary" disabled={!hasPieces} onClick={onRandomize}>랜덤 재배치</button>
        <button type="button" disabled={!hasPieces} onClick={onRandomRotate}>전체 회전</button>
        <button type="button" disabled={!hasPieces} onClick={onClearAll}>전체 삭제</button>
      </div>
      <div className="toolbar-group">
        <span className="toolbar-label">선택</span>
        <button type="button" disabled={!hasSelection} onClick={onRotate90}>90° 회전</button>
        <button type="button" disabled={!hasSelection} onClick={onFreeRotate}>자유 회전</button>
        <button type="button" disabled={!hasSelection} onClick={onToggleLock}>고정 토글</button>
        <button type="button" disabled={!hasSelection} onClick={onDelete}>삭제</button>
      </div>
    </header>
  )
}
