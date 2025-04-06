export type WorkTag =
	| typeof FunctionComponent
	| typeof ClassComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText
	| typeof Fragment
	| typeof SuspenseComponent
	| typeof MemoComponent
	| typeof ProfilerComponent
	| typeof SuspenseListComponent
	| typeof ContextProvider
	| typeof ContextConsumer
	| typeof ForwardRef
	| typeof SuspenseComponentWithReducer
	| typeof OffscreenComponent
	| typeof LegacyHiddenComponent
	| typeof CacheComponent
	| typeof CacheComponentWithReducer

export const FunctionComponent = 0 // 函数组件
export const ClassComponent = 1 // 类组件
export const HostRoot = 3 // 根节点
export const HostComponent = 5 // 宿主组件, 如 div, span, p 等
export const HostText = 6 // 宿主文本, 如 <div>hello</div> 中的 hello
export const Fragment = 7 // 片段, 如 <Fragment>hello</Fragment> 中的 hello
export const SuspenseComponent = 8 // 悬念组件, 如 <Suspense>hello</Suspense> 中的 hello
export const MemoComponent = 9 // 记忆组件, 如 <Memo>hello</Memo> 中的 hello

export const ProfilerComponent = 10 // 性能组件, 如 <Profiler>hello</Profiler> 中的 hello
export const SuspenseListComponent = 11 // 悬念列表组件, 如 <SuspenseList>hello</SuspenseList> 中的 hello
export const ContextProvider = 12 // 上下文提供者, 如 <ContextProvider>hello</ContextProvider> 中的 hello
export const ContextConsumer = 13 // 上下文消费者, 如 <ContextConsumer>hello</ContextConsumer> 中的 hello
export const ForwardRef = 14 // 转发引用, 如 <ForwardRef>hello</ForwardRef> 中的 hello
export const SuspenseComponentWithReducer = 15 // 悬念组件, 如 <Suspense>hello</Suspense> 中的 hello
export const OffscreenComponent = 16 // 离屏组件, 如 <Offscreen>hello</Offscreen> 中的 hello
export const LegacyHiddenComponent = 17 // 旧版隐藏组件, 如 <LegacyHidden>hello</LegacyHidden> 中的 hello
export const CacheComponent = 18 // 缓存组件, 如 <Cache>hello</Cache> 中的 hello
export const CacheComponentWithReducer = 19 // 缓存组件, 如 <Cache>hello</Cache> 中的 hello
