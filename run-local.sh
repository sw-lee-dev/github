#!/usr/bin/env bash
# 웹 빌드 → 백엔드 패키징 → http://localhost:8090 실행 (macOS / Linux)
# 포트 변경: ./run-local.sh 9000
# 필요: JDK 17+ (21 권장), Node.js 20+ (Maven 은 mvnw 가 자동으로 내려받음)
set -e
cd "$(dirname "$0")"
PORT="${1:-8090}"

echo "[1/3] 웹 화면 빌드"
(cd web && npm install && npm run build)

echo "[2/3] 백엔드 패키징 (웹 화면 포함)"
(cd backend && ./mvnw -q -DskipTests package)

echo "[3/3] 서버 시작 → http://localhost:${PORT}  (종료: Ctrl+C)"
SERVER_PORT="$PORT" java -jar backend/target/food-cost-approval-0.1.0.jar
