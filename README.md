# Paseo Usage Cache for Stream Deck

자체 UUID `com.wlrudxo.usagecache`로 Claude, Fable, Argon, GPT의 기존 로컬 사용량 관측만 표시한다. Marketplace 계정, provider 인증, 외부 사용량 API, 개발 모드는 사용하지 않는다. Stream Deck SDK가 사용하는 로컬 WebSocket만 연결한다.

## 설치와 기존 버튼 이전

1. Stream Deck을 트레이 메뉴에서 완전히 종료한다.
2. 이 repo의 `migrate-cache.cmd`를 한 번 실행한다. 기존 버튼 5개의 UUID만 바꾸고 링/막대, 지표, 크기 등 설정은 보존한다. 앱 실행 중에는 쓰기를 거부한다.
3. `dist/com.wlrudxo.usagecache.streamDeckPlugin`을 열어 설치를 수락한다. 앱이 열리면 기존 위치의 버튼을 확인한다.

이전 스크립트는 변경할 프로필 원본과 기존 Marketplace 플러그인 폴더를 `backups/migration-<시각>/`에 보관한다. 알 수 없는 기존 액션이 있으면 변경 전 중단한다. 기본 확인만 하려면 `scripts/migrate-cache.py`를 `--apply` 없이 실행한다. 앱이 다시 열린 상태에서 프로필을 수정하지 않는다.

복원은 앱을 종료한 상태에서 해당 백업의 ProfilesV3 파일들을 원 위치에 덮어쓰고 백업의 com.len.limits.sdPlugin을 Plugins에 되돌린다. 새 플러그인은 앱에서 제거할 수 있다. 실제 사용 중 수정된 프로필이 있으면 복원 전에 별도 보관한다.

## 빌드와 배포

`npm run pack:cache`는 독립 소스 `src/cache/`, 기존 렌더러와 아이콘을 빌드하고 공식 CLI로 일반 설치 패키지를 만든다. 산출물은 repo 안의 `com.wlrudxo.usagecache.sdPlugin/`와 `dist/`에만 둔다. 설치본 직접 수정, link, restart 딥링크, Marketplace UUID 재사용을 하지 않는다.

공식 배포 근거: [Elgato Distribution](https://docs.elgato.com/streamdeck/sdk/introduction/distribution/)은 패키지의 직접 사용자 배포를 지원한다. DRM은 Maker Console 처리 이후 적용된다. 로컬 제작 패키지는 Marketplace 등록 없이 배포한다.

## 캐시 계약

- `%LOCALAPPDATA%/usage_budget/display_claude.json`: five_hour, weekly, weekly_model_fable을 구분한다.
- 같은 폴더 `samples.jsonl`: Argon과 GPT 주간 값. 압축 이력의 마지막 관측은 until을 사용한다.
- 1분마다 읽고 마지막 관측이 3분 초과, 리셋 만료, 파일 부재이면 Cache stale. 없는 지표를 0%로 만들지 않는다.
- 캐시에 없는 GPT credit, GPT 5시간, 다른 Antigravity 모델은 no data다.
- 로그의 `sent cached display`는 SDK로 이미지/피드백을 보냈다는 뜻이며 물리 USB 화면 수신 확인은 아니다.

검증: `npm test`, Python `scripts/test_migrate_cache.py`, `node scripts/verify-cache.mjs`. 마지막 명령은 65초 동안 격리된 로컬 시험 호스트로 실제 번들을 실행해 초기/주기 전송과 생존을 확인한다. Stream Deck 본체와 프로필은 조작하지 않는다.

출처: [lenadweb/stream-deck-ai-limits](https://github.com/lenadweb/stream-deck-ai-limits), 기존 fork 기준 `594338b`(그 전 관리 기준 `9d8c145`). MIT 라이선스와 원 저작권은 LICENSE에 유지한다. 기존 upstream 소스는 참고용이고 독립 패키지 진입점은 `src/cache/plugin.ts`다.
