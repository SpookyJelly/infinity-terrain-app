import { useCallback, useEffect, useState } from "react";
import { PRESET_PIECES } from "../data/presets";
import type {
  AppUiFlags,
  DeploymentZone,
  MapConfig,
  PlacedPiece,
  TerrainPiece,
} from "../types/terrain";
import {
  canPlace,
  getPieceDef,
  snapRotation90,
  tryRandomPlacement,
} from "../utils/geometry";
import { uid } from "../utils/id";
import {
  mergeLibraries,
  parseLibraryJson,
  serializeLibrary,
} from "../utils/libraryIo";
import { randomizeLayout } from "../utils/placement";

const DEFAULT_MAP: MapConfig = {
  widthIn: 48,
  heightIn: 48,
  borderBufferIn: 2,
};

const DEFAULT_DZ: DeploymentZone = {
  visible: true,
  axis: "NS",
  depthIn: 8,
};

const LIBRARY_STORAGE_KEY = "infinity-terrain-library";

function loadLibrary(): TerrainPiece[] {
  try {
    const saved = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (saved) {
      const parsed = parseLibraryJson(saved);
      if (parsed.ok) return parsed.library;
    }
  } catch {
    // Storage may be unavailable; keep the built-in library usable.
  }
  return PRESET_PIECES.map((p) => ({ ...p, footprint: { ...p.footprint } }));
}

export function useMapState() {
  const [library, setLibrary] = useState<TerrainPiece[]>(loadLibrary);
  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_STORAGE_KEY, serializeLibrary(library));
    } catch {
      setStatusMsg("브라우저 저장 공간에 라이브러리를 저장하지 못했습니다.");
    }
  }, [library]);
  const [map, setMap] = useState<MapConfig>(DEFAULT_MAP);
  const [pieces, setPieces] = useState<PlacedPiece[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deployment, setDeployment] = useState<DeploymentZone>(DEFAULT_DZ);
  const [ui, setUi] = useState<AppUiFlags>({ showGrid: true });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const setMapSize = useCallback((widthIn: number, heightIn: number) => {
    setMap((prev) => ({
      ...prev,
      widthIn: Math.max(12, widthIn),
      heightIn: Math.max(12, heightIn),
    }));
  }, []);

  const setBorderBuffer = useCallback((borderBufferIn: number) => {
    setMap((prev) => ({
      ...prev,
      borderBufferIn: Math.max(0, borderBufferIn),
    }));
  }, []);

  const applyPreset = useCallback(
    (sizeFt: 3 | 4) => {
      const inches = sizeFt * 12;
      setMapSize(inches, inches);
    },
    [setMapSize],
  );

  const addPieceFromLibrary = useCallback(
    (pieceId: string) => {
      const def = getPieceDef(library, pieceId);
      if (!def) return;
      if (def.maxCount !== null) {
        const used = pieces.filter((p) => p.pieceId === pieceId).length;
        if (used >= def.maxCount) {
          setStatusMsg(
            `「${def.name}」은(는) 최대 ${def.maxCount}개까지 배치할 수 있습니다.`,
          );
          return;
        }
      }

      const placed = tryRandomPlacement(
        pieceId,
        uid("inst"),
        pieces,
        library,
        map,
        100,
      );
      if (!placed) {
        setStatusMsg(`「${def.name}」을(를) 놓을 빈 자리가 없습니다.`);
        return;
      }
      setPieces((prev) => [...prev, placed]);
      setSelectedIds([placed.instanceId]);
      setStatusMsg(null);
    },
    [library, map, pieces],
  );

  const selectPiece = useCallback(
    (instanceId: string | null, additive = false) => {
      if (instanceId === null) {
        setSelectedIds([]);
        return;
      }
      setSelectedIds((prev) => {
        if (additive) {
          if (prev.includes(instanceId)) {
            return prev.filter((id) => id !== instanceId);
          }
          return [...prev, instanceId];
        }
        return [instanceId];
      });
    },
    [],
  );

  const movePiece = useCallback((instanceId: string, x: number, y: number) => {
    setPieces((prev) =>
      prev.map((p) => (p.instanceId === instanceId ? { ...p, x, y } : p)),
    );
  }, []);

  const setPieceRotation = useCallback(
    (instanceId: string, rotation: number) => {
      setPieces((prev) =>
        prev.map((p) => (p.instanceId === instanceId ? { ...p, rotation } : p)),
      );
    },
    [],
  );

  const rotateSelected90 = useCallback(() => {
    if (selectedIds.length === 0) return;
    const idSet = new Set(selectedIds);
    setPieces((prev) =>
      prev.map((p) => {
        if (!idSet.has(p.instanceId)) return p;
        const next = snapRotation90(p.rotation + 90);
        return { ...p, rotation: next };
      }),
    );
  }, [selectedIds]);

  const randomRotateUnlocked = useCallback(() => {
    const count = pieces.filter((piece) => !piece.locked).length
    if (count === 0) {
      setStatusMsg("회전할 수 있는 고정되지 않은 지형이 없습니다.")
      return
    }
    setPieces((prev) =>
      prev.map((piece) =>
        piece.locked ? piece : { ...piece, rotation: Math.random() * 360 },
      ),
    )
    setStatusMsg("고정되지 않은 지형을 모두 무작위로 회전했습니다.")
  }, [pieces])
  const freeRotateSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const idSet = new Set(selectedIds);
    setPieces((prev) =>
      prev.map((p) => {
        if (!idSet.has(p.instanceId)) return p;
        return { ...p, rotation: Math.random() * 360 };
      }),
    );
    setStatusMsg("자유 회전 적용 (충돌검사 없음 — 겹치면 직접 옮겨 주세요)");
  }, [selectedIds]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const idSet = new Set(selectedIds);
    setPieces((prev) => prev.filter((p) => !idSet.has(p.instanceId)));
    setSelectedIds([]);
  }, [selectedIds]);

  const toggleLockSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const idSet = new Set(selectedIds);
    setPieces((prev) =>
      prev.map((p) => {
        if (!idSet.has(p.instanceId)) return p;
        return { ...p, locked: !p.locked };
      }),
    );
  }, [selectedIds]);

  const randomizeAll = useCallback(() => {
    if (pieces.length === 0) {
      setStatusMsg(
        "맵에 배치된 지형이 없습니다. 사이드바에서 먼저 추가하세요.",
      );
      return;
    }
    const unlockedCount = pieces.filter((p) => !p.locked).length;
    if (unlockedCount === 0) {
      setStatusMsg("고정되지 않은 지형이 없어 재배치할 대상이 없습니다.");
      return;
    }
    const {
      pieces: next,
      failed,
      balanced,
      centerFilled,
      skippedCenterRule,
    } = randomizeLayout(library, map, pieces, deployment);
    setPieces(next);
    setSelectedIds([]);

    const notes: string[] = [];
    if (failed.length > 0) {
      notes.push(`${failed.length}개는 자리 부족으로 위치 유지`);
    }
    if (balanced) notes.push("좌우 커버리지 균형");
    else notes.push("좌우 커버리지가 조금 기울어짐");
    if (!skippedCenterRule) {
      notes.push(centerFilled ? "중앙에 중형 이상 배치" : "중앙이 비어 있음");
    }
    setStatusMsg(`${unlockedCount}개 재배치. ${notes.join(" · ")}`);
  }, [deployment, library, map, pieces]);

  const clearAll = useCallback(() => {
    setPieces([]);
    setSelectedIds([]);
    setStatusMsg("맵의 지형을 모두 삭제했습니다.");
  }, []);

  /** Optional: after drag, no collision enforcement (manual). Kept for future. */
  const isValidPlacement = useCallback(
    (candidate: PlacedPiece) => canPlace(candidate, pieces, library, map),
    [library, map, pieces],
  );

  const toggleGrid = useCallback(() => {
    setUi((prev) => ({ ...prev, showGrid: !prev.showGrid }));
  }, []);

  const toggleDeployment = useCallback(() => {
    setDeployment((prev) => ({ ...prev, visible: !prev.visible }));
  }, []);

  const setDeploymentDepth = useCallback(
    (depthIn: number) => {
      setDeployment((prev) => {
        const maxDepth =
          prev.axis === "NS" ? map.heightIn / 2 - 1 : map.widthIn / 2 - 1;
        return {
          ...prev,
          depthIn: Math.min(Math.max(1, depthIn), maxDepth),
        };
      });
    },
    [map.heightIn, map.widthIn],
  );

  const setDeploymentAxis = useCallback((axis: DeploymentZone["axis"]) => {
    setDeployment((prev) => ({ ...prev, axis }));
  }, []);

  const addLibraryPiece = useCallback((piece: TerrainPiece): boolean => {
    const name = piece.name.trim();
    if (!name) {
      setStatusMsg("지형 이름을 입력하세요.");
      return false;
    }
    const next: TerrainPiece = { ...piece, id: uid("piece"), name };
    setLibrary((prev) => [...prev, next]);
    setStatusMsg(`「${name}」을(를) 라이브러리에 추가했습니다.`);
    return true;
  }, []);

  const updateLibraryPiece = useCallback((piece: TerrainPiece) => {
    const name = piece.name.trim();
    if (!name) {
      setStatusMsg("지형 이름을 입력하세요.");
      return;
    }
    setLibrary((prev) =>
      prev.map((p) => (p.id === piece.id ? { ...piece, name } : p)),
    );
    setStatusMsg(`「${name}」 수치를 저장했습니다.`);
  }, []);

  const removeLibraryPiece = useCallback(
    (pieceId: string): boolean => {
      if (library.length <= 1) {
        setStatusMsg("라이브러리에는 지형이 하나 이상 있어야 합니다.");
        return false;
      }
      if (pieces.some((p) => p.pieceId === pieceId)) {
        setStatusMsg("맵에 배치된 지형은 라이브러리에서 삭제할 수 없습니다.");
        return false;
      }
      const name = getPieceDef(library, pieceId)?.name ?? pieceId;
      setLibrary((prev) => prev.filter((p) => p.id !== pieceId));
      setStatusMsg(`「${name}」을(를) 라이브러리에서 삭제했습니다.`);
      return true;
    },
    [library, pieces],
  );

  const saveSelectedAsDerived = useCallback(
    (draft: TerrainPiece) => {
      if (selectedIds.length !== 1) return;
      const instanceId = selectedIds[0];
      const placed = pieces.find((p) => p.instanceId === instanceId);
      if (!placed) return;
      const name = draft.name.trim() || `${draft.name} (수정됨)`;
      const next: TerrainPiece = {
        ...draft,
        id: uid("piece"),
        name,
        derivedFrom: placed.pieceId,
      };
      setLibrary((prev) => [...prev, next]);
      setPieces((prev) =>
        prev.map((p) =>
          p.instanceId === instanceId ? { ...p, pieceId: next.id } : p,
        ),
      );
      setStatusMsg(`「${name}」을(를) 새 에셋으로 저장했습니다.`);
    },
    [pieces, selectedIds],
  );

  const exportLibrary = useCallback(() => serializeLibrary(library), [library]);

  const importLibrary = useCallback(
    (text: string, mode: "merge" | "replace") => {
      const parsed = parseLibraryJson(text);
      if (!parsed.ok) {
        setStatusMsg(parsed.error);
        return;
      }
      if (mode === "replace") {
        const ids = new Set(parsed.library.map((p) => p.id));
        setLibrary(parsed.library);
        setPieces((prev) => prev.filter((p) => ids.has(p.pieceId)));
        setSelectedIds([]);
        setStatusMsg(
          `라이브러리를 덮어썼습니다 (${parsed.library.length}개). 없는 에셋의 맵 배치는 제거됩니다.`,
        );
        return;
      }
      setLibrary((prev) => mergeLibraries(prev, parsed.library));
      setStatusMsg(
        `라이브러리를 병합했습니다 (${parsed.library.length}개 항목).`,
      );
    },
    [],
  );

  // const selectedInstance =
  //   selectedIds.length === 1
  //     ? pieces.find((p) => p.instanceId === selectedIds[0])
  //     : undefined
  // const selectedDef = selectedInstance
  //   ? getPieceDef(library, selectedInstance.pieceId)
  //   : undefined

  const clearStatus = useCallback(() => setStatusMsg(null), []);

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
    addLibraryPiece,
    updateLibraryPiece,
    removeLibraryPiece,
    saveSelectedAsDerived,
    exportLibrary,
    importLibrary,
    // selectedDef,
    selectPiece,
    movePiece,
    setPieceRotation,
    rotateSelected90,
    freeRotateSelected,
    randomRotateUnlocked,
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
  };
}
