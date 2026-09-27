import { useCallback, useState } from 'react'
import { PRESET_PIECES } from '../data/presets'
import type {
  AppUiFlags,
  DeploymentZone,
  MapConfig,
  PlacedPiece,
  TerrainPiece,
} from '../types/terrain'
import {
  canPlace,
  getPieceDef,
  snapRotation90,
  tryRandomPlacement,
} from '../utils/geometry'
import { randomizeLayout } from '../utils/placement'

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

const DEFAULT_MAP: MapConfig = {
  widthIn: 48,
  heightIn: 48,
  borderBufferIn: 2,
}

const DEFAULT_DZ: DeploymentZone = {
  visible: true,
  axis: 'NS',
  depthIn: 8,
}

export function useMapState() {
  const [library] = useState<TerrainPiece[]>(PRESET_PIECES)
  const [map, setMap] = useState<MapConfig>(DEFAULT_MAP)
  const [pieces, setPieces] = useState<PlacedPiece[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deployment, setDeployment] = useState<DeploymentZone>(DEFAULT_DZ)
  const [ui, setUi] = useState<AppUiFlags>({ showGrid: true })
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const setMapSize = useCallback((widthIn: number, heightIn: number) => {
    setMap((prev) => ({
      ...prev,
      widthIn: Math.max(12, widthIn),
      heightIn: Math.max(12, heightIn),
    }))
  }, [])

  const setBorderBuffer = useCallback((borderBufferIn: number) => {
    setMap((prev) => ({
      ...prev,
      borderBufferIn: Math.max(0, borderBufferIn),
    }))
  }, [])

  const applyPreset = useCallback(
    (sizeFt: 3 | 4) => {
      const inches = sizeFt * 12
      setMapSize(inches, inches)
    },
    [setMapSize],
  )

  const addPieceFromLibrary = useCallback(
    (pieceId: string) => {
      const def = getPieceDef(library, pieceId)
      if (!def) return

      const placed = tryRandomPlacement(
        pieceId,
        uid('inst'),
        pieces,
        library,
        map,
        100,
      )
      if (!placed) {
        setStatusMsg(`「${def.name}」을(를) 놓을 빈 자리가 없습니다.`)
        return
      }
      setPieces((prev) => [...prev, placed])
      setSelectedIds([placed.instanceId])
      setStatusMsg(null)
    },
    [library, map, pieces],
  )

  const selectPiece = useCallback(
    (instanceId: string | null, additive = false) => {
      if (instanceId === null) {
        setSelectedIds([])
        return
      }
      setSelectedIds((prev) => {
        if (additive) {
          if (prev.includes(instanceId)) {
            return prev.filter((id) => id !== instanceId)
          }
          return [...prev, instanceId]
        }
        return [instanceId]
      })
    },
    [],
  )

  const movePiece = useCallback((instanceId: string, x: number, y: number) => {
    setPieces((prev) =>
      prev.map((p) => (p.instanceId === instanceId ? { ...p, x, y } : p)),
    )
  }, [])

  const setPieceRotation = useCallback(
    (instanceId: string, rotation: number) => {
      setPieces((prev) =>
        prev.map((p) =>
          p.instanceId === instanceId ? { ...p, rotation } : p,
        ),
      )
    },
    [],
  )

  const rotateSelected90 = useCallback(() => {
    if (selectedIds.length === 0) return
    const idSet = new Set(selectedIds)
    setPieces((prev) =>
      prev.map((p) => {
        if (!idSet.has(p.instanceId)) return p
        const next = snapRotation90(p.rotation + 90)
        return { ...p, rotation: next }
      }),
    )
  }, [selectedIds])

  const freeRotateSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    const idSet = new Set(selectedIds)
    setPieces((prev) =>
      prev.map((p) => {
        if (!idSet.has(p.instanceId)) return p
        return { ...p, rotation: Math.random() * 360 }
      }),
    )
    setStatusMsg('자유 회전 적용 (충돌검사 없음 — 겹치면 직접 옮겨 주세요)')
  }, [selectedIds])

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    const idSet = new Set(selectedIds)
    setPieces((prev) => prev.filter((p) => !idSet.has(p.instanceId)))
    setSelectedIds([])
  }, [selectedIds])

  const toggleLockSelected = useCallback(() => {
    if (selectedIds.length === 0) return
    const idSet = new Set(selectedIds)
    setPieces((prev) =>
      prev.map((p) => {
        if (!idSet.has(p.instanceId)) return p
        return { ...p, locked: !p.locked }
      }),
    )
  }, [selectedIds])

  const randomizeAll = useCallback(() => {
    if (pieces.length === 0) {
      setStatusMsg('맵에 배치된 지형이 없습니다. 사이드바에서 먼저 추가하세요.')
      return
    }
    const unlockedCount = pieces.filter((p) => !p.locked).length
    if (unlockedCount === 0) {
      setStatusMsg('고정되지 않은 지형이 없어 재배치할 대상이 없습니다.')
      return
    }
    const { pieces: next, failed } = randomizeLayout(library, map, pieces)
    setPieces(next)
    setSelectedIds([])
    if (failed.length > 0) {
      setStatusMsg(
        `랜덤 재배치 완료. ${failed.length}개는 자리 부족으로 위치 유지.`,
      )
    } else {
      setStatusMsg(`${unlockedCount}개 지형을 랜덤 재배치했습니다.`)
    }
  }, [library, map, pieces])

  const clearAll = useCallback(() => {
    setPieces([])
    setSelectedIds([])
    setStatusMsg('맵의 지형을 모두 삭제했습니다.')
  }, [])

  /** Optional: after drag, no collision enforcement (manual). Kept for future. */
  const isValidPlacement = useCallback(
    (candidate: PlacedPiece) => canPlace(candidate, pieces, library, map),
    [library, map, pieces],
  )

  const toggleGrid = useCallback(() => {
    setUi((prev) => ({ ...prev, showGrid: !prev.showGrid }))
  }, [])

  const toggleDeployment = useCallback(() => {
    setDeployment((prev) => ({ ...prev, visible: !prev.visible }))
  }, [])

  const setDeploymentDepth = useCallback(
    (depthIn: number) => {
      setDeployment((prev) => {
        const maxDepth =
          prev.axis === 'NS' ? map.heightIn / 2 - 1 : map.widthIn / 2 - 1
        return {
          ...prev,
          depthIn: Math.min(Math.max(1, depthIn), maxDepth),
        }
      })
    },
    [map.heightIn, map.widthIn],
  )

  const setDeploymentAxis = useCallback((axis: DeploymentZone['axis']) => {
    setDeployment((prev) => ({ ...prev, axis }))
  }, [])

  const clearStatus = useCallback(() => setStatusMsg(null), [])

  return {
    library,
    map,
    pieces,
    selectedIds,
    deployment,
    ui,
    statusMsg,
    setMapSize,
    setBorderBuffer,
    applyPreset,
    addPieceFromLibrary,
    selectPiece,
    movePiece,
    setPieceRotation,
    rotateSelected90,
    freeRotateSelected,
    deleteSelected,
    toggleLockSelected,
    randomizeAll,
    clearAll,
    isValidPlacement,
    toggleGrid,
    toggleDeployment,
    setDeploymentDepth,
    setDeploymentAxis,
    clearStatus,
  }
}
