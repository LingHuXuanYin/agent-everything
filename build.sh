#!/bin/sh
# 部署适配脚本：在远程构建环境安装依赖、构建前端与后端，并组装运行时产物 dist/。
# 注意：末尾会执行 npm prune --omit=dev，会移除本地 node_modules 中的开发依赖，
# 请勿在本地开发环境直接运行；日常构建请用 `npm run build`。
set -eu

export NPM_CONFIG_REGISTRY='https://registry.npmjs.org/'
npm ci --registry='https://registry.npmjs.org/'
npm run build
npm prune --omit=dev

mkdir -p dist/web
cp -R server/dist dist/server
cp -R web/dist dist/web/dist
cp -R data dist/
cp package.json run.sh dist/
cp -R node_modules dist/node_modules
chmod 755 dist/run.sh
