import { defineConfig } from 'vitest/config'

/** 仅覆盖零依赖的纯函数模块；客户端渲染链路依赖宿主 DOM，不在单测范围内。 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
