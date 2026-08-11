# 项目知识记录

## react-vant 3.3.5 组件 API 注意事项
- 日期: 2026-08-06
- 上下文: 排查 H5 用户端页面空白崩溃时发现
- 类别: 开发规范
- 说明:
  - react-vant 3.3.5 的 `NavBar.leftArrow` 在传入布尔值 `true` 时，组件内部会调用 `React.cloneElement(true)` 导致渲染崩溃（`Element type is invalid: got: undefined`）。类型定义虽支持 `boolean | ReactNode`，但实际实现未处理布尔值分支。必须传 React 元素（如 `<ArrowLeft width={20} height={20} />`）。
  - react-vant 的 `GridItem.icon`、`Cell.icon`、`Button.icon` 等 `icon` prop 内部使用 `React.cloneElement` 处理。传入字符串会导致崩溃，必须传 React 元素。
  - react-vant 的正确组件是 `Tabs.TabPane`（不是 `Tabs.Tab`）。
  - react-vant 的 `Empty` 组件在 ESM 环境中导出有效，是可用的 forwardRef 组件。
  - 所有带 `icon` prop 或 `leftArrow` prop 的页面统一使用 `@react-vant/icons` 元素（不要用字符串）。