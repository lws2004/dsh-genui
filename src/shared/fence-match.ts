/** 快照侧的代码围栏。与 source-fence.ts 的同名接口结构一致；在这里独立声明，
 * 让本模块保持零运行时依赖，纯函数可以直接被单测加载。 */
export interface SourceFence {
  lang: string | null
  value: string
  openingLineComplete: boolean
}

/** 正文是否指向同一段围栏：流式期间 DOM 与快照的正文长度不同，但只要一方是
 * 另一方的前缀，就是同一段围栏。 */
export function sameFenceBody(value: string, raw: string): boolean {
  const left = value.trim()
  const right = raw.trim()
  if (left === '' || right === '') return false
  if (left === right) return true
  return left.length < right.length ? right.startsWith(left) : left.startsWith(right)
}

/**
 * 按正文匹配快照围栏，序号只作兜底。
 *
 * 宿主会隐去它不认识的语言（`dsh-ui` 在 DOM 里是本地化通用标题「代码块」），
 * 所以流式期间语言只能来自快照；而 DOM 序号与快照围栏序号在「快照滞后」
 * 「两侧枚举规则不同」「一条消息被拆成多个 text block」时会错位，取到错的
 * 语言或 undefined——表现为围栏停在代码块上直到回复结束（settled 后才有
 * 内容识别兜底）。正文匹配不受序号影响。
 *
 * @param fences - 该 assistant 消息在快照中的围栏，按文档顺序。
 * @param raw - DOM 代码块正文。
 * @param index - 宿主代码块在该行内的序号，正文匹配失败时回退使用。
 * @returns 命中的围栏；正文与序号都无对应时返回 undefined。
 */
export function resolveFenceByBody(fences: readonly SourceFence[], raw: string, index: number): SourceFence | undefined {
  const byIndex = index >= 0 ? fences[index] : undefined
  if (byIndex !== undefined && sameFenceBody(byIndex.value, raw)) return byIndex
  let best: { fence: SourceFence; length: number } | undefined
  for (const fence of fences) {
    if (!sameFenceBody(fence.value, raw)) continue
    const length = Math.min(fence.value.trim().length, raw.trim().length)
    if (best === undefined || length > best.length) best = { fence, length }
  }
  return best?.fence ?? byIndex
}
