import type { TerrainPiece } from '../types/terrain'

/** 1단계용 하드코딩 프리셋 (이후 단계에서 편집 가능). */
export const PRESET_PIECES: TerrainPiece[] = [
  {
    id: 'small-crate',
    name: '소형 상자',
    footprint: { width: 2, depth: 2 },
    category: 'partial_cover',
    maxCount: null,
    hasSecondFloor: false,
    hasLadder: false,
    color: '#8b7355',
  },
  {
    id: 'med-wall',
    name: '폐허 벽',
    footprint: { width: 8, depth: 2 },
    category: 'total_cover',
    maxCount: null,
    hasSecondFloor: false,
    hasLadder: false,
    color: '#6b6b6b',
  },
  {
    id: 'large-building',
    name: '대형 건물',
    footprint: { width: 10, depth: 8 },
    category: 'total_cover',
    maxCount: 4,
    hasSecondFloor: false,
    hasLadder: false,
    color: '#4a5568',
  },
  {
    id: 'bush',
    name: '수풀',
    footprint: { width: 4, depth: 4 },
    category: 'partial_cover',
    maxCount: null,
    hasSecondFloor: false,
    hasLadder: false,
    color: '#3d7a4a',
  },
]
