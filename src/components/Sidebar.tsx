import { useRef, useState } from 'react'
import type { TerrainPiece } from '../types/terrain'
import { CATEGORY_LABELS } from '../utils/labels'
import { blankTerrain, TerrainForm } from './TerrainForm'

interface SidebarProps {
  library: TerrainPiece[]
  onPlace: (pieceId: string) => void
  onUpdatePiece: (piece: TerrainPiece) => void
  onAddPiece: (piece: TerrainPiece) => boolean
  onRemovePiece: (pieceId: string) => boolean
  onExport: () => void
  onImportFile: (text: string, mode: 'merge' | 'replace') => void
}

export function Sidebar({
  library,
  onPlace,
  onUpdatePiece,
  onAddPiece,
  onRemovePiece,
  onExport,
  onImportFile,
}: SidebarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TerrainPiece | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addDraft, setAddDraft] = useState<TerrainPiece>(() =>
    blankTerrain('new'),
  )
  const [pendingImport, setPendingImport] = useState<string | null>(null)

  const startEdit = (piece: TerrainPiece) => {
    setEditingId(piece.id)
    setDraft({ ...piece, footprint: { ...piece.footprint } })
    setShowAdd(false)
  }

  const saveEdit = () => {
    if (!draft || !draft.name.trim()) return
    onUpdatePiece({ ...draft, name: draft.name.trim() })
    setEditingId(null)
    setDraft(null)
  }

  const submitAdd = () => {
    if (!addDraft.name.trim()) return
    const ok = onAddPiece({ ...addDraft, name: addDraft.name.trim() })
    if (ok) {
      setShowAdd(false)
      setAddDraft(blankTerrain('new'))
    }
  }

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">지형 라이브러리</h2>
      <p className="sidebar-hint">
        카드를 누르면 맵에 1개 배치됩니다. 수치는 여기서 바로 고칠 수 있습니다.
      </p>

      <div className="lib-actions">
        <button type="button" onClick={onExport}>
          JSON 내보내기
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          JSON 가져오기
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setPendingImport(await file.text())
          }}
        />
      </div>

      {pendingImport && (
        <div className="import-choice">
          <p>가져온 라이브러리를 어떻게 적용할까요?</p>
          <button
            type="button"
            onClick={() => {
              onImportFile(pendingImport, 'merge')
              setPendingImport(null)
            }}
          >
            병합
          </button>
          <button
            type="button"
            onClick={() => {
              onImportFile(pendingImport, 'replace')
              setPendingImport(null)
            }}
          >
            덮어쓰기
          </button>
          <button type="button" onClick={() => setPendingImport(null)}>
            취소
          </button>
        </div>
      )}

      <button
        type="button"
        className="btn-primary add-piece-btn"
        onClick={() => {
          setShowAdd((v) => !v)
          setEditingId(null)
        }}
      >
        {showAdd ? '추가 취소' : '새 지형 추가'}
      </button>

      {showAdd && (
        <div className="lib-editor">
          <TerrainForm
            idPrefix="add"
            value={addDraft}
            onChange={setAddDraft}
          />
          <button type="button" className="btn-primary" onClick={submitAdd}>
            라이브러리에 추가
          </button>
        </div>
      )}

      <ul className="piece-list">
        {library.map((piece) => (
          <li key={piece.id}>
            <div className="piece-card-wrap">
              <button
                type="button"
                className="piece-card"
                onClick={() => onPlace(piece.id)}
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
                    {piece.derivedFrom ? ' · 파생' : ''}
                  </span>
                </span>
              </button>
              <div className="piece-card-actions">
                <button type="button" onClick={() => startEdit(piece)}>
                  편집
                </button>
                <button
                  type="button"
                  onClick={() => onRemovePiece(piece.id)}
                >
                  삭제
                </button>
              </div>
            </div>
            {editingId === piece.id && draft && (
              <div className="lib-editor">
                <TerrainForm
                  idPrefix={`edit-${piece.id}`}
                  value={draft}
                  onChange={setDraft}
                />
                <div className="form-row">
                  <button type="button" className="btn-primary" onClick={saveEdit}>
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setDraft(null)
                    }}
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </aside>
  )
}
