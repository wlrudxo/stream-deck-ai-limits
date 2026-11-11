# Paseo Usage Cache for Stream Deck

자체 UUID `com.wlrudxo.usagecache`로 Claude, Fable, Argon, GPT의 로컬 사용량 캐시를 표시한다. 인증이나 외부 사용량 API 호출 없이 Stream Deck SDK의 로컬 WebSocket에 연결한다.

## 빌드와 설치

Node.js 24에서 `npm ci`, `npm test`, `npm run pack:cache` 순서로 실행한다. 패키지는 `dist/com.wlrudxo.usagecache.streamDeckPlugin`이다. 사용자가 이 파일을 열어 설치한다. 빌드는 repo 내부에만 출력하며 설치본과 앱 프로세스를 변경하지 않는다.

`npm run build`와 호환 별칭 `npm run build:cache`는 번들만 만든다. `npm run verify:cache`는 빌드 후 65초간 격리된 로컬 시험 호스트로 초기 전송과 1분 갱신을 확인한다.

## 구조

- `src/cache/`: 독립 진입점, 매니페스트, 설정 화면, 아이콘, 다이얼 레이아웃.
- `src/services/display-usage.ts`: 로컬 캐시 읽기와 유효성 검사.
- `src/ui/`, `src/interfaces/`, `src/utils/`: 링과 막대 렌더러, 표시 타입, 남은 시간 형식.
- `scripts/`: 패키지 준비와 격리 호스트 검증. `test/`: 캐시 파서 시험.
- `com.wlrudxo.usagecache.sdPlugin/`, `dist/`: Git에서 제외하는 빌드 산출물.

## 캐시 계약

`%LOCALAPPDATA%/usage_budget/display_claude.json`의 `successfulAt`과 창별 `id`, `usedPct`, `resetsAt`을 읽는다. `five_hour`, `weekly`, `weekly_model_fable`은 각각 5시간, 전체 주간, Fable 주간이다. Fable은 표시 키 `7d_fable_quota`로 연결한다. 감시 쪽 `usage_budget` 커밋 `6a27605`의 모델 주간 출력과 같은 계약이다.

같은 폴더의 `samples.jsonl`에서 Argon과 GPT 주간 값을 읽는다. 압축 표본은 마지막 관측 시각 `until`을 사용한다. Argon의 두 표시 ID를 지원한다. 캐시에 없는 GPT credit, GPT 5시간, 다른 Antigravity 모델은 `no data`다.

1분마다 읽으며 관측이 10분 초과하거나 리셋 만료 또는 파일 부재이면 `Cache stale`을 표시한다. 없는 지표를 0%로 만들지 않는다. 로그의 `sent cached display`는 SDK 전송 기록이다.

## 유지 결정과 출처

이렇게 정함: `migrate-cache`는 설치 때 완료한 일회성 이전 도구이므로 실행 파일과 시험을 제거했다. 기존 `backups/`는 보존하며 새 버전 설치에 이전 스크립트는 필요하지 않다.

원본은 [lenadweb/stream-deck-ai-limits](https://github.com/lenadweb/stream-deck-ai-limits), 재사용 기준은 `594338b`다. 렌더러와 아이콘의 MIT 라이선스 및 원 저작권은 [LICENSE](LICENSE)에 유지한다.
