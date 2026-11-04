/**
 * 校验地图引擎产物。
 *
 * 地图依赖两样在浏览器里没法从磁盘按需取的东西：样式表和 module worker。
 * 构建期由 maplibreResourcesPlugin 把它们内联进 lib/assets/maplibre.js，
 * 一旦内联失效（依赖升级改了文件名/结构），地图在离线页里会静默变成空白——
 * 没有报错，只是不显示。这里在构建阶段把这种退化挡住。
 */
import { readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const target = resolve(projectRoot, 'lib/assets/maplibre.js')

const problems = []

let size = 0
try {
  size = (await stat(target)).size
} catch {
  problems.push('lib/assets/maplibre.js 不存在——先跑 npm run build')
}

if (problems.length === 0 && size === 0) {
  problems.push('lib/assets/maplibre.js 是空文件')
}

if (problems.length === 0) {
  const code = await readFile(target, 'utf8')
  if (!/^\s*\(function\s*\(/.test(code)) {
    problems.push('maplibre.js 不是 IIFE 形态——离线页无法直接内联')
  }
  if (/^\s*import\s+/m.test(code) || /^\s*export\s+/m.test(code)) {
    problems.push('maplibre.js 含 import/export 语句——离线页无法解析模块')
  }
  // 版本标识：确认打包进去的是预期的那份发行版，而不是某个陈旧副本。
  if (!code.includes('MapLibre GL JS')) {
    problems.push('maplibre.js 未包含 MapLibre 版本头——产物来源不明')
  }
  // 内联的样式表：地图容器没有它就只有一片空白画布。
  if (!code.includes('maplibregl-canvas')) {
    problems.push('maplibre.js 未内联样式表——地图会渲染成空白')
  }
}

if (problems.length > 0) {
  console.error('[check-map-assets] 失败：')
  for (const problem of problems) console.error('  - ' + problem)
  process.exit(1)
}

console.log(`[check-map-assets] 通过：maplibre.js ${(size / 1024 / 1024).toFixed(2)} MB，IIFE，样式与 worker 已内联`)
