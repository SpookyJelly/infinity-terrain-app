# Infinity 지형 배치 (infinity-terrain-app)

인피니티 N5용 지형을 2D 조감도로 랜덤/수동 배치하는 웹 앱입니다.

스펙: ../terrain-randomizer-spec.md
로드맵: ../terrain-randomizer-roadmap.md

## 5단계 (현재)

- 2층 지형 풋프린트를 1층 위에 밝은 면과 교차선으로 표시
- 지정된 변의 사다리 위치를 노란 선분으로 표시
- 12인치 격자와 X/Y 인치 좌표 라벨
- 배치 결과 별도 표시는 두지 않고 맵 조작에 집중
- GitHub Pages 배포용 gh-pages, 상대경로 빌드 설정

## 개발 서버

npm install
npm run dev

## GitHub Pages 배포

GitHub 저장소를 origin 원격으로 연결한 뒤 실행합니다.

npm run deploy

predeploy가 프로덕션 빌드를 먼저 만들고, gh-pages가 dist 내용을 gh-pages 브랜치로 게시합니다. GitHub 저장소 설정의 Pages 게시 소스를 gh-pages 브랜치로 지정해야 합니다.