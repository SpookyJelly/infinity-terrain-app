# Infinity 지형 배치 (infinity-terrain-app)

인피니티 N5용 지형을 2D 조감도로 랜덤/수동 배치하는 웹 앱입니다.

스펙: `../terrain-randomizer-spec.md`  
로드맵: `../terrain-randomizer-roadmap.md`

## 2단계 (현재)

- 1단계 기능 + AABB 충돌검사 · 테두리 버퍼
- 사이드바 클릭 → 빈 자리 탐색 (실패 시 알림)
- 밀집도 슬라이더 + 전체 랜덤 배치 (고정된 조각 유지)
- 다중 선택 · 자유 회전 · 회전 핸들 드래그
- 선택 / 드래그 / 90° 회전 / 고정 / 삭제

## 실행

```bash
npm install
npm run dev
```
