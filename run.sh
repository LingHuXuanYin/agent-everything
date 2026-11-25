#!/bin/sh
# 部署运行时入口：由 build.sh 复制到 dist/ 后执行，工作目录为 dist/。
# 单进程同时托管前端静态站点与 /api 接口。
set -eu

export PORT="${PORT:-8000}"
exec node server/index.js
