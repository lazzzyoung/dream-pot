# 기여 가이드

## 브랜치 전략 — Git Flow

| 브랜치 | 역할 | 딴 곳 |
|---|---|---|
| `main` | 배포 가능한 안정 버전만 | `develop`에서 릴리스될 때만 머지 |
| `develop` | 다음 릴리스를 향한 통합 브랜치. 평소 작업은 여기로 모임 | `main`에서 분기 |
| `feature/*` | 기능 단위 작업. 화면 하나, 컴포넌트 하나 단위를 권장 | `develop`에서 분기 |
| `release/*` | 릴리스 준비 (버전 정리, 막판 버그픽스) | `develop`에서 분기 |
| `hotfix/*` | 배포된 버전의 긴급 수정 | `main`에서 분기 |

```bash
# 기능 작업 시작
git switch develop
git switch -c feature/purchase-animation

# 작업 끝나면 develop으로 PR
gh pr create --base develop --head feature/purchase-animation

# 릴리스 준비
git switch develop
git switch -c release/0.2.0
# 버전 정리, 마지막 버그픽스
# 완료되면 main과 develop 양쪽에 머지 + 태그

# 긴급 수정
git switch main
git switch -c hotfix/coin-rounding
# 수정 후 main과 develop 양쪽에 머지
```

브랜치 이름은 영어 kebab-case: `feature/`, `release/`, `hotfix/` 접두사 뒤에
무엇을 하는지 짧게. 이슈 번호가 있으면 `feature/12-purchase-animation`처럼 붙인다.

## 커밋 컨벤션 — Conventional Commits

```
<type>(<scope>): <subject>

<body>
```

**type**

| type | 의미 |
|---|---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서만 변경 |
| `style` | 코드 동작에 영향 없는 서식 변경 (세미콜론, 들여쓰기 등) |
| `refactor` | 기능 변경 없는 코드 구조 개선 |
| `perf` | 성능 개선 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 설정, 의존성 등 그 외 |

**scope**는 건드린 영역. 이 프로젝트에서는 `store`, `parts`, `blueprint`,
`shop`, `deposit`, `confirm`, `search`, `main`, `svg`, `css` 등을 쓴다.

**subject**는 한국어 한 줄, 명령형·현재형("추가" O, "추가함"/"추가했음" X),
마침표 없이, 무엇을 왜 바꿨는지.

```
feat(purchase): 구매 연출 시퀀스 추가 — 도장, 코인 카운트다운, 비행, draw-on
fix(parts): 월말 보정 시 addMonths가 하루 밀리는 문제 수정
docs(readme): 프로젝트명을 Dream Pot으로 변경
refactor(shop): 카드 아이콘 프레이밍을 도면 bbox 기반으로 정리
chore(git): CONTRIBUTING.md와 PR 템플릿 추가
```

깨는 변경(breaking change)이 있으면 body에 `BREAKING CHANGE:`로 명시한다.
(이 프로젝트는 단일 사용자 로컬 저장이라 주로 `store.js`의 스키마 버전이 해당된다.)

## PR

- 제목은 커밋 컨벤션과 동일한 형식
- `develop`을 베이스로 잡는다 (릴리스/핫픽스 제외)
- 템플릿(`.github/PULL_REQUEST_TEMPLATE.md`)의 체크리스트를 채운다
- CLAUDE.md의 검증 순서(새로고침 유지, 375px, reduced-motion 등)를 실제로
  브라우저에서 확인한 뒤 올린다

## 하지 말 것

- `main`에 직접 커밋
- `--force` 푸시 (특히 `main`, `develop`)
- 동작하지 않는 상태로 커밋
- 테스트 러너가 없는 프로젝트이므로, "확인했다"는 말 대신 실제로 확인한
  화면/상태를 PR 설명에 적는다
