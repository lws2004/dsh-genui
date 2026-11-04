/**
 * 构建前置清理：删除 lib/ 目录。
 *
 * tsc 与 tsdown 都输出到 lib，二者都是增量写入、不会删除已经消失的源文件对应
 * 的旧产物。没有这一步，删掉一个源文件后它的 .js / .d.ts 会一直留在 lib 里被打包。
 *
 * 必须在 tsc 之前跑：tsdown 自身的 clean 选项会连 lib/types（tsc 的声明输出）
 * 一起清掉，所以 tsdown.config.ts 里统一关掉 clean，清理只由本脚本负责。
 */
import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))

await rm(resolve(projectRoot, 'lib'), { recursive: true, force: true })
