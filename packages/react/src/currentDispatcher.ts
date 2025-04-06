/**
 * hooks 的集合定义
 */
export interface Dispatcher {
	useState: <T>(initialState: T | (() => T)) => [T, Dispatch<T>]
	useEffect: (create: () => () => void, deps: any[]) => void
}

export type Dispatch<State> = (
	action: State | ((prevState: State) => State),
) => void
/**
 * hooks 只能运行在函数组件中，且要知道当前执行时处于的上下文，挂载、更新、hooks上下文中（比如在useEffect中使用useState可能存在问题，就可以报警处理）。
 * 我们知道，在react-reconciler中，我们明确知道当前是处于什么阶段的，
 * 所以我们可以为不同的上下文实现不同的 hooks 集合, 虽然 hook 的名字相同，都是 useState，但是实现不同
 * 当处于挂载阶段的时候，current 就指向实现了挂载阶段的 hooks 集合，
 * 当处于更新阶段的时候，current 就指向实现了更新阶段的 hooks 集合
 * 这里的 current 就相当于一个上下文，用来存储当前的 dispatcher，并且通过 `react`包 向外暴露
 */
const currentDispatcher: { current: Dispatcher | null } = {
	current: null,
}

/**
 * 获取当前的 dispatcher
 */
export const resolveDispatcher = (): Dispatcher => {
	const dispatcher = currentDispatcher.current
	if (!dispatcher) {
		throw new Error('Hooks 只能存在于函数组件中')
	}
	return dispatcher
}

export default currentDispatcher
