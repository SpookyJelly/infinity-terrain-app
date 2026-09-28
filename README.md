# Infinity 지형 배치 (infinity-terrain-app)

인피니티 N5용 지형을 2D 조감도로 랜덤/수동 배치하는 웹 앱입니다.

스펙: `../terrain-randomizer-spec.md`  
로드맵: `../terrain-randomizer-roadmap.md`

## 3단계 (현재)

- 맵에 올려 둔 조각만 랜덤 재배치 (고정된 조각 유지)
- 좌우 절반 커버리지 편차 억제 (±10%)
- 중앙 근처에 중형 이상 지형 우선 배치
- 배치구역 안 대형 지형 가중치 낮춤
- 다중 선택 · 자유 회전 · 회전 핸들 드래그
- 선택 / 드래그 / 90° 회전 / 고정 / 삭제 / 전체 삭제

## 실행

```bash
npm install
npm run dev
```
