import { useState } from 'react'
import type { TerrainPiece } from '../types/terrain'
import { CATEGORY_LABELS } from '../utils/labels'
import { blankTerrain, TerrainForm } from './TerrainForm'

interface SidebarProps {
  library: TerrainPiece[]
  onPlace: (pieceId: string) => void
  onUpdatePiece: (piece: TerrainPiece) => void
  onAddPiece: (piece: TerrainPiece) => boolean
  onRemovePiece: (pieceId: string) => boolean
  onExport: () => string
  onImport: (text: string, mode: 'merge' | 'replace') => void
}

export function Sidebar({
  library,
  onPlace,
  onUpdatePiece,
  onAddPiece,
  onRemovePiece,
  onExport,
  onImport,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TerrainPiece | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addDraft, setAddDraft] = useState<TerrainPiece>(() =>
    blankTerrain('new'),
  )
  const [dataPanel, setDataPanel] = useState<'export' | 'import' | null>(null)
  const [exportText, setExportText] = useState('')
  const [importText, setImportText] = useState('')
  const [copyMessage, setCopyMessage] = useState('')

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
        <button type="button" onClick={() => {
          setExportText(onExport())
          setCopyMessage('')
          setDataPanel(dataPanel === 'export' ? null : 'export')
        }}>
          JSON 내보내기
        </button>
        <button type="button" onClick={() => setDataPanel(dataPanel === 'import' ? null : 'import')}>
          JSON 가져오기
        </button>
      </div>

      {dataPanel === 'export' && (
        <div className="library-data-panel">
          <label htmlFor="library-export">라이브러리 JSON</label>
          <textarea id="library-export" value={exportText} readOnly />
          <button type="button" onClick={async () => {
            try {
              await navigator.clipboard.writeText(exportText)
              setCopyMessage('복사했습니다.')
            } catch {
              setCopyMessage('복사할 수 없습니다. 텍스트를 직접 선택해 복사해 주세요.')
            }
          }}>텍스트 복사</button>
          {copyMessage && <small role="status">{copyMessage}</small>}
        </div>
      )}

      {dataPanel === 'import' && (
        <div className="import-choice">
          <label htmlFor="library-import">JSON 텍스트를 붙여넣으세요</label>
          <textarea id="library-import" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="JSON 붙여넣기" />
          <p>가져온 라이브러리를 어떻게 적용할까요?</p>
          <button
            type="button"
            onClick={() => {
              onImport(importText, 'merge')
            }}
          >
            병합
          </button>
          <button
            type="button"
            onClick={() => {
              onImport(importText, 'replace')
            }}
          >
            덮어쓰기
          </button>
          <button type="button" onClick={() => setDataPanel(null)}>닫기</button>
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
