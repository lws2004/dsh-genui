import { describe, expect, it } from 'vitest'
import { resolveFenceByBody, sameFenceBody, type SourceFence } from '../src/shared/fence-match.ts'

/** 构造一条快照围栏，默认正文已完整解析。 */
function fence(value: string, lang: string | null = 'dsh-ui'): SourceFence {
  return { lang, value, openingLineComplete: true }
}

describe('sameFenceBody', () => {
  it('正文完全一致时判为同一段', () => {
    expect(sameFenceBody('{"a":1}', '{"a":1}')).toBe(true)
  })

  it('快照正文比 DOM 短时，前缀命中即同一段（快照滞后）', () => {
    expect(sameFenceBody('{"a":1', '{"a":1,"b":2}')).toBe(true)
  })

  it('DOM 正文比快照短时，前缀命中即同一段（围栏仍在流式写入）', () => {
    expect(sameFenceBody('{"a":1,"b":2}', '{"a":1')).toBe(true)
  })

  it('前半相同但分歧点在中间时不是同一段（不能只看开头几个字符）', () => {
    expect(sameFenceBody('{"a":1}', '{"a":1,"b":2}')).toBe(false)
  })

  it('两侧空白差异不影响判定', () => {
    expect(sameFenceBody('  {"a":1}  ', '\n{"a":1}\n')).toBe(true)
  })

  it('正文不同则不是同一段', () => {
    expect(sameFenceBody('{"a":1}', '{"b":2}')).toBe(false)
  })

  it('一方为空时一律不判为同一段，避免空正文匹配到任意围栏', () => {
    expect(sameFenceBody('', '{"a":1}')).toBe(false)
    expect(sameFenceBody('{"a":1}', '')).toBe(false)
    expect(sameFenceBody('   ', '   ')).toBe(false)
  })
})

describe('resolveFenceByBody', () => {
  const first = fence('{"title":"甲"}')
  const second = fence('{"title":"乙"}')
  const fences = [first, second]

  it('序号正确且正文一致时走快路径，返回该序号围栏', () => {
    expect(resolveFenceByBody(fences, '{"title":"乙"}', 1)).toBe(second)
  })

  it('序号错位时按正文纠正，不返回错误语言的围栏', () => {
    expect(resolveFenceByBody(fences, '{"title":"乙"}', 0)).toBe(second)
  })

  it('序号越界时按正文匹配', () => {
    expect(resolveFenceByBody(fences, '{"title":"甲"}', 99)).toBe(first)
  })

  it('正文是流式未写完的前缀时，仍能匹配到对应围栏', () => {
    expect(resolveFenceByBody(fences, '{"title":"乙"', 0)).toBe(second)
  })

  it('正文与序号都无法对应时回退到序号围栏', () => {
    expect(resolveFenceByBody(fences, '{"title":"丙"}', 0)).toBe(first)
  })

  it('序号为负且正文无匹配时返回 undefined', () => {
    expect(resolveFenceByBody(fences, '{"title":"丙"}', -1)).toBeUndefined()
  })

  it('空快照列表一律返回 undefined', () => {
    expect(resolveFenceByBody([], '{"title":"甲"}', 0)).toBeUndefined()
  })

  it('多条围栏正文互为前缀时取匹配最长的那条', () => {
    const short = fence('{"a":1}')
    const long = fence('{"a":1,"b":2}')
    expect(resolveFenceByBody([short, long], '{"a":1,"b":2}', 5)).toBe(long)
  })

  it('保留围栏自带的语言字段，供调用方判定是否接管', () => {
    const plain = fence('{"a":1}', null)
    expect(resolveFenceByBody([plain], '{"a":1}', 0)?.lang).toBeNull()
  })
})
