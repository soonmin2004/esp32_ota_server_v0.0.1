## 실행
프로젝트 루트( `Dockerfile` 있는 곳 )에 `.env` 저장 후 실행합니다.

`docker compose up -d --build`

변경 후 재배포: `docker compose up -d --build` (기존 컨테이너 자동 교체)  
중지/삭제: `docker compose down`

## 엔드포인트
- `GET /health`
- `GET /firmware/info?device=<id>` (헤더: `x-api-key`, `x-mac`)
- `GET /firmware?device=<id>` (헤더: `x-api-key`, `x-mac`)
- `POST /report` (헤더: `x-api-key`, `x-mac`, body에 `device`/`mac` 포함 가능)

`.env` 예시는 `.env.example` 참고.

## API Key 생성
- 출력만: `npm run gen:apikey`
- `.env`에 저장/교체: `npm run gen:apikey:write`
- `.env`에 추가(기존 키 유지): `npm run gen:apikey:append`

## MAC allowlist (자동 reload)
- 권장: `config/device_macs.json` 파일로 관리하고 `DEVICE_MACS_FILE`로 경로를 지정합니다.
- 파일이 변경되면 서버가 자동으로 다시 읽어 반영합니다(재시작 불필요).
- `DEVICE_MACS` 환경변수도 계속 지원하며, 최종 allowlist는 `DEVICE_MACS` + `DEVICE_MACS_FILE`의 합집합(merge)으로 동작합니다.

## 업데이트 이력 로그
- OTA 성공(`status=success`) 리포트가 들어오면 사람이 보기 쉬운 이력 로그를 추가로 남깁니다.
- 파일: `logs/ota-updates.log` 및 `logs/ota-updates-<device>.log`
- 형식(TSV): `날짜(ts)	디바이스ID	기존버전	업데이트버전	MAC	IP	status	message`
