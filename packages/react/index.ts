import currentDispatcher, {
	Dispatcher,
	resolveDispatcher,
} from './src/currentDispatcher'
import { jsxDEV } from './src/jsx'

export type { Dispatch } from './src/currentDispatcher'

export const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher()
	return dispatcher.useState(initialState)
}

export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
	const dispatcher = resolveDispatcher()
	return dispatcher.useEffect(create, deps)
}

/**
 * 内部数据共享层，用于在切换上下文时存放不同的 hooks 实现集合，相当于一个抽象接口
 * 诸如 useState 等 hooks 的实现，在不同阶段有不同的实现，所以需要根据当前阶段来决定使用哪个实现
 * 对于使用方来说是无感知的
 */
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	currentDispatcher,
}

export default {
	version: '0.1.0',
	createElement: jsxDEV,
}
