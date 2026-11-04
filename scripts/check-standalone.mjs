/**
 * 校验独立 HTML 导出的运行时产物。
 *
 * standalone-runtime.js 是「把 GenUI 卡片导出成离线 HTML」时内联进页面的那份
 * 运行时。它必须自包含：一旦残留 import 语句，导出的 HTML 在 file:// 下就打不开，
 * 而这个问题只在用户真正导出后才会暴露。这里在构建阶段把它挡下来。
 */
import { readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const target = resolve(projectRoot, 'lib/assets/standalone-runtime.js')

const problems = []

let size = 0
try {
  size = (await stat(target)).size
} catch {
  problems.push('lib/assets/standalone-runtime.js 不存在——先跑 npm run build')
}

if (problems.length === 0 && size === 0) {
  problems.push('lib/assets/standalone-runtime.js 是空文件')
}

if (problems.length === 0) {
  const code = await readFile(target, 'utf8')
  // IIFE：产物必须是一个自执行的表达式，不能是模块。
  if (!/^\s*(?:\(function|!\(function|!\(|;?\()/.test(code)) {
    problems.push('standalone-runtime.js 不是 IIFE 形态——离线 HTML 内联后无法执行')
  }
  // 没有对外 import / export：内联进 <script> 时不存在模块解析器。
  if (/^\s*import\s+/m.test(code) || /^\s*export\s+/m.test(code)) {
    problems.push('standalone-runtime.js 含 import/export 语句——离线 HTML 内联后无法解析模块')
  }
  // 资产注册表：运行时靠它在没有 module loader 的环境里拿到懒加载引擎。
  if (!code.includes('__GenuiAssets__')) {
    problems.push('standalone-runtime.js 未注册 __GenuiAssets__——离线环境拿不到图表/地图引擎')
  }
}

if (problems.length > 0) {
  console.error('[check-standalone] 失败：')
  for (const problem of problems) console.error('  - ' + problem)
  process.exit(1)
}

console.log(`[check-standalone] 通过：standalone-runtime.js ${(size / 1024 / 1024).toFixed(2)} MB，IIFE，无外部依赖`)
