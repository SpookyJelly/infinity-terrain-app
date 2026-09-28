import { useEffect, useState } from 'react'
import type { TerrainPiece } from '../types/terrain'
import { TerrainForm } from './TerrainForm'

interface PieceInspectorProps {
  piece: TerrainPiece
  onSaveAsDerived: (draft: TerrainPiece) => void
}

export function PieceInspector({ piece, onSaveAsDerived }: PieceInspectorProps) {
  const [draft, setDraft] = useState<TerrainPiece>(piece)

  useEffect(() => {
    setDraft({
      ...piece,
      footprint: { ...piece.footprint },
      name: piece.name.endsWith('(수정됨)')
        ? piece.name
        : `${piece.name} (수정됨)`,
    })
  }, [piece])

  return (
    <section className="inspector">
      <h3 className="inspector-title">선택 지형 수치</h3>
      <p className="sidebar-hint">
        값을 바꿔도 원본 라이브러리는 그대로입니다. 저장하면 새 에셋이 추가되고
        맵의 이 조각이 그 에셋으로 바뀝니다.
      </p>
      <TerrainForm idPrefix="inspect" value={draft} onChange={setDraft} />
      <button
        type="button"
        className="btn-primary"
        disabled={!draft.name.trim()}
        onClick={() => onSaveAsDerived(draft)}
      >
        새 에셋으로 저장
      </button>
    </section>
  )
}
