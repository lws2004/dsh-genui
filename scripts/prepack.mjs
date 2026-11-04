/**
 * npm publish 前的产物完整性校验。
 *
 * package.json 的 files 字段决定了包里到底有什么。这个仓库的产物（lib/**）是
 * 构建出来的、不入版本控制的中间物，所以「忘了构建就发布」是一个真实可能发生
 * 的失误——npm 会照样打包，只是包里少文件，装到用户机器上才报错。这里在 prepack
 * 阶段把缺失的产物逐个点出来。
 */
import { readFile, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const pkg = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'))

const problems = []

/** files 里可能写文件也可能写目录；两者都要能判存在。 */
for (const entry of pkg.files ?? []) {
  if (!entry.startsWith('lib')) continue
  const full = resolve(projectRoot, entry)
  try {
    await stat(full)
  } catch {
    problems.push(`缺少产物：${entry}（先跑 npm run build）`)
  }
}

/** 包入口指向的声明文件：TS 使用方靠它拿类型。 */
for (const [field, value] of [['main', pkg.main], ['types', pkg.types]]) {
  if (typeof value !== 'string') continue
  try {
    await stat(resolve(projectRoot, value))
  } catch {
    problems.push(`${field} 指向的文件不存在：${value}`)
  }
}

/** exports 里的每个子路径都要能落地，否则 import 会失败。 */
const exported = Object.values(pkg.exports ?? {})
for (const target of exported) {
  if (typeof target !== 'object' || target === null) continue
  for (const [condition, value] of Object.entries(target)) {
    if (typeof value !== 'string' || !value.startsWith('./')) continue
    try {
      await stat(resolve(projectRoot, value))
    } catch {
      problems.push(`exports.${condition} 指向的文件不存在：${value}`)
    }
  }
}

if (problems.length > 0) {
  console.error('[prepack] 失败：')
  for (const problem of problems) console.error('  - ' + problem)
  process.exit(1)
}

console.log(`[prepack] 通过：${pkg.name}@${pkg.version} 的 files 与 exports 产物齐全`)
