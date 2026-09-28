# Infinity 지형 배치 (infinity-terrain-app)

인피니티 N5용 지형을 2D 조감도로 랜덤/수동 배치하는 웹 앱입니다.

스펙: `../terrain-randomizer-spec.md`  
로드맵: `../terrain-randomizer-roadmap.md`

## 4단계 (현재)

- 맵에 올려 둔 조각만 랜덤 재배치 + 좌우/중앙 밸런스
- 라이브러리 커스텀 추가 · 프리셋 수치 편집 · 삭제
- 맵에서 선택 → 수치 수정 → 파생 에셋 저장 (`derivedFrom`)
- 라이브러리 JSON 내보내기 / 가져오기 (병합 또는 덮어쓰기)
- 다중 선택 · 자유 회전 · 고정 / 삭제 / 전체 삭제

## 실행

```bash
npm install
npm run dev
```
