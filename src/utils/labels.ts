import type { TerrainCategory } from '../types/terrain'

export const CATEGORY_LABELS: Record<TerrainCategory, string> = {
  total_cover: '완전 엄폐',
  partial_cover: '부분 엄폐',
  impassable: '통과 불가',
  special: '특수',
}
