# Dream Pot (드림팟)

저축을 게임화하는 웹앱 프로토타입. 저축액을 코인으로 바꿔서, 반투명한
목표 물건의 설계도를 부품 하나씩 사서 실물로 채워 나갑니다.

인앱 브랜드명은 **부품상** — 도면이 걸린 부품상 뒷방이라는 세계관을
그대로 UI 톤으로 씁니다. 자세한 요구사항과 작업 지침은
[docs/PRD.md](docs/PRD.md), [docs/CLAUDE.md](docs/CLAUDE.md)에 있습니다.

## 기술 스택

의존성 없는 정적 HTML/CSS/JS. 빌드 스텝 없음, npm 없음, 프레임워크 없음,
CDN 없음. ES 모듈로 파일을 분리합니다. 저장소는 `localStorage` 하나.

## 실행

빌드가 없으므로 정적 파일 서버 하나면 됩니다.

```bash
python3 -m http.server 4173
```

`http://localhost:4173`에서 확인합니다.

## 폴더 구조

```
index.html
css/            디자인 토큰, 레이아웃, 애니메이션
js/
  store.js      상태·localStorage — 유일한 저장 경로
  parts.js      순수 계산 (가격, 인증 스케줄, 구매 가능 여부)
  catalog.js    검색 카탈로그
  screens/      화면 단위 (검색, 등록, 메인)
  ui/           컴포넌트 (도면, 상점, 저금 카드, 구매 연출)
svg/            모델3 측면 설계도 (부품별 <g> 분리)
docs/           PRD, 작업 지침
IDEAS.md        범위 밖 아이디어와 보류 사유
```

## 기여

브랜치 전략과 커밋 컨벤션은 [CONTRIBUTING.md](CONTRIBUTING.md)를 따릅니다.
