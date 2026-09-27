import type { TerrainPiece } from '../types/terrain'
import { CATEGORY_LABELS } from '../utils/labels'

interface SidebarProps {
  library: TerrainPiece[]
  onAdd: (pieceId: string) => void
}

export function Sidebar({ library, onAdd }: SidebarProps) {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">지형 라이브러리</h2>
      <p className="sidebar-hint">
        클릭하면 빈 자리에 1개 배치됩니다. Shift/Ctrl+클릭으로 다중 선택.
      </p>
      <ul className="piece-list">
        {library.map((piece) => (
          <li key={piece.id}>
            <button
              type="button"
              className="piece-card"
              onClick={() => onAdd(piece.id)}
            >
              <span
                className="piece-swatch"
                style={{ background: piece.color }}
                aria-hidden
              />
              <span className="piece-meta">
                <strong>{piece.name}</strong>
                <span className="piece-dims">
                  {piece.footprint.width}″ × {piece.footprint.depth}″
                </span>
                <span className="piece-cat">
                  {CATEGORY_LABELS[piece.category]}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
