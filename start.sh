#!/usr/bin/env bash
# 미리 빌드된 앱 실행 (JDK 17+ 만 필요). 포트 변경: ./start.sh 9000
cd "$(dirname "$0")"
PORT="${1:-8090}"
JAR=release/food-cost-approval.jar
[ -f "$JAR" ] || JAR=backend/target/food-cost-approval-0.1.0.jar
[ -f "$JAR" ] || { echo "빌드된 jar 가 없습니다. ./run-local.sh 를 한 번 실행하세요."; exit 1; }
echo "Starting server: http://localhost:${PORT}  (stop: Ctrl+C) / login: writer / 1234"
SERVER_PORT="$PORT" exec java -jar "$JAR"
