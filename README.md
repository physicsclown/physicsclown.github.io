# MathCheck AI - 초기 시제품

학생이 웹 페이지 안에서 S펜으로 수학 풀이를 작성하고 제출하는 디지털 노트의 프런트엔드 시제품입니다.

## 현재 구현된 기능

- 학생 노트 / 교사 관리자 화면 전환
- 한 화면에 여러 문제를 배치한 교과서형 레이아웃
- S펜 입력(`pointerType === "pen"`)만 허용하는 필기 캔버스
- 펜, 지우개, 마지막 획 실행 취소, 전체 지우기
- 브라우저 `localStorage`에 임시 풀이 저장
- 제출 기록을 같은 브라우저의 관리자 화면에 표시

## 아직 구현되지 않은 기능

- GPT/Gemini API를 이용한 실제 AI 평가
- 교사 계정과 학생 계정의 로그인 및 권한 관리
- 서로 다른 기기 사이의 제출 데이터 공유
- 실제 과제/교과서 문제 등록 기능
- 서버 데이터베이스와 이미지/필기 보관 정책

현재 제출 기록은 **제출한 기기의 브라우저에만** 저장됩니다. 다른 기기의 교사 관리자 화면으로 전송되지 않습니다. 실제 학교에서 사용하기 전에 서버, 인증, 접근 제어, 개인정보 보호 설계를 추가해야 합니다.

## GitHub Pages에서 실행하기

1. GitHub에서 새 저장소(repository)를 만듭니다.
2. `index.html`, `style.css`, `app.js`, `README.md`를 저장소 최상위(root)에 업로드합니다.
3. 저장소의 **Settings → Pages**로 이동합니다.
4. **Deploy from a branch**를 선택합니다.
5. Branch를 `main`, 폴더를 `/ (root)`로 선택하고 저장합니다.
6. 잠시 후 표시되는 GitHub Pages 주소로 접속합니다.

이 프로젝트는 별도 빌드 과정이 없는 정적 웹사이트이므로 GitHub Pages로 화면을 미리 볼 수 있습니다.

## 갤럭시탭에서 필기 테스트

- GitHub Pages 주소를 Chrome 또는 Samsung Internet에서 엽니다.
- 학생 노트 화면에서 S펜으로 필기해 봅니다.
- 손가락 입력은 의도적으로 무시합니다.
- 브라우저를 새로고침한 뒤 필기가 남아 있는지 확인합니다.

기기/브라우저가 S펜을 Pointer Events의 `pen` 유형으로 전달하지 않는 경우 필기가 입력되지 않을 수 있습니다. 그 경우 개발자 도구로 `event.pointerType` 값을 확인하고 `app.js`의 `pointerdown` 및 `pointermove` 조건을 조정합니다.

## 코드 파일 설명

- `index.html`: 화면의 구조와 문제 내용
- `style.css`: 화면 배치, 색상, 반응형 디자인
- `app.js`: 필기 입력, 저장, 제출, 관리자 목록

## 디버깅 시작점

- 필기가 안 될 때: `app.js`의 `attachPenEvents()`
- 필기가 화면 크기 변경 후 어긋날 때: `resizeCanvas()`와 `getCanvasPoint()`
- 저장이 안 될 때: `saveDraft()`와 `loadDraft()`
- 제출이 안 될 때: `submitWork()`
- 교사 목록이 안 나올 때: `renderSubmissionList()`
- 문제 문구/개수를 바꿀 때: `index.html`의 `.problem` 요소

## 주의

이 저장소에는 API 키, 실제 학생 개인정보, 실제 제출 답안 사진을 올리지 마세요.
