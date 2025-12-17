프로젝트 루트( Dockerfile 있는 곳 )에 위 파일 저장.
docker compose up -d --build
변경 후 재배포: docker compose up -d --build (기존 컨테이너 자동 교체)
중지/삭제: docker compose down