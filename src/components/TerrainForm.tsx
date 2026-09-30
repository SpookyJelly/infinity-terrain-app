import type {
  LadderSide,
  TerrainCategory,
  TerrainPiece,
} from '../types/terrain'
import { CATEGORY_LABELS } from '../utils/labels'
import { FlexibleNumberInput } from './FlexibleNumberInput'

const SIDE_LABELS: Record<LadderSide, string> = {
  N: '북',
  S: '남',
  E: '동',
  W: '서',
}

interface TerrainFormProps {
  value: TerrainPiece
  onChange: (next: TerrainPiece) => void
  idPrefix: string
}

export function blankTerrain(id: string): TerrainPiece {
  return {
    id,
    name: '',
    footprint: { width: 4, depth: 4 },
    category: 'partial_cover',
    maxCount: null,
    hasSecondFloor: false,
    hasLadder: false,
    color: '#6b7c59',
  }
}

export function TerrainForm({ value, onChange, idPrefix }: TerrainFormProps) {
  const set = (patch: Partial<TerrainPiece>) => onChange({ ...value, ...patch })

  return (
    <div className="terrain-form">
      <label>
        이름
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
        />
      </label>
      <div className="form-row">
        <label>
          가로 ″
          <FlexibleNumberInput value={value.footprint.width} min={0.5} step={0.5} onChange={(width) => width !== null && set({ footprint: { ...value.footprint, width } })} />
        </label>
        <label>
          세로 ″
          <FlexibleNumberInput value={value.footprint.depth} min={0.5} step={0.5} onChange={(depth) => depth !== null && set({ footprint: { ...value.footprint, depth } })} />
        </label>
      </div>
      <label>
        카테고리
        <select
          value={value.category}
          onChange={(e) =>
            set({ category: e.target.value as TerrainCategory })
          }
        >
          {(Object.keys(CATEGORY_LABELS) as TerrainCategory[]).map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
      <div className="form-row">
        <label>
          색상
          <input
            type="color"
            value={value.color}
            onChange={(e) => set({ color: e.target.value })}
          />
        </label>
        <label>
          최대 개수
          <input
            type="number"
            min={1}
            placeholder="무제한"
            value={value.maxCount ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              set({
                maxCount: raw === '' ? null : Math.max(1, Number(raw) || 1),
              })
            }}
          />
        </label>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={value.hasSecondFloor}
          onChange={(e) => {
            const on = e.target.checked
            set({
              hasSecondFloor: on,
              secondFloor: on
                ? (value.secondFloor ?? {
                    width: value.footprint.width * 0.7,
                    depth: value.footprint.depth * 0.7,
                    offsetX: 0,
                    offsetY: 0,
                  })
                : undefined,
            })
          }}
        />
        2층
      </label>
      {value.hasSecondFloor && (
        <>
        <div className="form-row form-row-4">
          <label>
            2층 가로
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={value.secondFloor?.width ?? 1}
              onChange={(e) =>
                set({
                  secondFloor: {
                    width: Math.max(0.5, Number(e.target.value) || 0.5),
                    depth: value.secondFloor?.depth ?? 1,
                    offsetX: value.secondFloor?.offsetX ?? 0,
                    offsetY: value.secondFloor?.offsetY ?? 0,
                  },
                })
              }
            />
          </label>
          <label>
            2층 세로
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={value.secondFloor?.depth ?? 1}
              onChange={(e) =>
                set({
                  secondFloor: {
                    width: value.secondFloor?.width ?? 1,
                    depth: Math.max(0.5, Number(e.target.value) || 0.5),
                    offsetX: value.secondFloor?.offsetX ?? 0,
                    offsetY: value.secondFloor?.offsetY ?? 0,
                  },
                })
              }
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            2층 X 오프셋
            <input
              type="number"
              step="0.5"
              value={value.secondFloor?.offsetX ?? 0}
              onChange={(e) => set({ secondFloor: {
                width: value.secondFloor?.width ?? 1,
                depth: value.secondFloor?.depth ?? 1,
                offsetX: Number(e.target.value) || 0,
                offsetY: value.secondFloor?.offsetY ?? 0,
              } })}
            />
          </label>
          <label>
            2층 Y 오프셋
            <input
              type="number"
              step="0.5"
              value={value.secondFloor?.offsetY ?? 0}
              onChange={(e) => set({ secondFloor: {
                width: value.secondFloor?.width ?? 1,
                depth: value.secondFloor?.depth ?? 1,
                offsetX: value.secondFloor?.offsetX ?? 0,
                offsetY: Number(e.target.value) || 0,
              } })}
            />
          </label>
        </div>
        </>
      )}
      <label className="check-row">
        <input
          type="checkbox"
          checked={value.hasLadder}
          onChange={(e) => {
            const on = e.target.checked
            set({
              hasLadder: on,
              ladderPosition: on
                ? (value.ladderPosition ?? { x: 0, y: 0, side: 'S' })
                : undefined,
            })
          }}
        />
        사다리
      </label>
      {value.hasLadder && (
        <label>
          사다리 변
          <select
            value={value.ladderPosition?.side ?? 'S'}
            onChange={(e) =>
              set({
                ladderPosition: {
                  x: value.ladderPosition?.x ?? 0,
                  y: value.ladderPosition?.y ?? 0,
                  side: e.target.value as LadderSide,
                },
              })
            }
          >
            {(Object.keys(SIDE_LABELS) as LadderSide[]).map((side) => (
              <option key={side} value={side}>
                {SIDE_LABELS[side]}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
