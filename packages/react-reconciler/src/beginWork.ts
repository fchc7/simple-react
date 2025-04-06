import { ReactElement } from 'shared/ReactTypes'
import { reconcileChildFibers, mountChildFibers } from './childFibers'
import { FiberNode } from './fiber'
import { processUpdateQueue, UpdateQueue } from './updateQueue'
import {
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
} from './workTags'
import { renderWithHooks } from './fiberHooks'
import { Lane } from './fiberLanes'

/**
 * 递归生成 FiberNode 树的 递 阶段
 * 1.计算状态的最新值
 * 2.创建并且返回子级 FiberNode
 * @param fiber 当前正在工作的 FiberNode
 * @returns 子级 FiberNode
 */
export const beginWork = (
	wip: FiberNode,
	renderLane: Lane,
): FiberNode | null => {
	switch (wip.tag) {
		case HostRoot:
			// 因为会调用 processUpdateQueue 方法，所以需要传入 renderLane
			return updateHostRoot(wip, renderLane)
		case HostComponent:
			return updateHostComponent(wip)
		case HostText:
			// <div>hello</div>, {type: 'div', props: {children: 'hello'}}，其中字符串‘hello’就是 HostText 类型
			// 对于文本节点，我们不需要计算状态值，也不需要创建子级 FiberNode，
			// 相当于该条路径已经结束递的状态，直接返回 null 即可
			return null
		case Fragment:
			return updateFragment(wip)
		case FunctionComponent:
			// 因为会调用 processUpdateQueue 方法，所以需要传入 renderLane
			return updateFunctionComponent(wip, renderLane)
		default:
			if (__DEV__) {
				console.warn('beginWork 未处理的 tag', wip.tag)
			}
			return null
	}
}

/**
 * 1. 计算状态的最新值
 * 2. 创建并且返回子级 FiberNode
 * @example
 * ReactDOM.createRoot(rootElement).render(<App />)
 * // 我们提到过 render => updateContainer => scheduleUpdateOnFiber，
 * // 在 updateContainer 中的 update 操作就是将 <App /> 作为参数传入，
 * // 所以这里计算得到的最新状态值 memoizedState 就是 <App /> 对应的 ReactElement 元素，
 * // 然后我们调用 reconcileChildren 方法，将 <App /> 作为参数传入，就能创建对应的子级 FiberNode，即 HostRootFiber 的子级 FiberNode <App />
 * // 然后返回这个子级 FiberNode
 * @param wip
 * @returns
 */
function updateHostRoot(wip: FiberNode, renderLane: Lane): FiberNode | null {
	const baseState = wip.memoizedState
	const updateQueue = wip.updateQueue as UpdateQueue<Element>
	const pending = updateQueue.shared.pending
	updateQueue.shared.pending = null

	const { memoizedState } = processUpdateQueue(baseState, pending, renderLane)
	wip.memoizedState = memoizedState

	const nextChildren = wip.memoizedState
	reconcileChildren(wip, nextChildren)

	return wip.child
}

/**
 * 对于原生标签<div>，我们不需要计算状态值，但是需要注意 props 属性的变化
 * @param wip
 * @returns
 */
function updateHostComponent(wip: FiberNode): FiberNode | null {
	// 可以在 README.md 中查看 ReactElement 的类型中属性是如何存放的，
	// 或者找一个React项目，打印一下 console.log(<div>元素</div>) 的输出结果
	// 子节点是作为 children 属性存放在 props 中的
	const nextProps = wip.pendingProps
	const nextChildren = nextProps.children
	reconcileChildren(wip, nextChildren)

	return wip.child
}

function reconcileChildren(wip: FiberNode, children?: ReactElement) {
	const current = wip.alternate

	// 这里针对 更新和挂载 两种情况进行优化处理
	// 首次渲染时，HostRootFiber 的 alternate 不为 null（在 createWorkInProgress 时创建了），所以会走 reconcileChildFibers 这个分支
	if (current !== null) {
		// 更新
		wip.child = reconcileChildFibers(wip, current.child, children)
	} else {
		// 挂载
		wip.child = mountChildFibers(wip, null, children)
	}
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
	const nextChildren = renderWithHooks(wip, renderLane)
	reconcileChildren(wip, nextChildren)
	return wip.child
}

/**
 * 更新 Fragment 组件
 * @param wip
 * @returns
 */
function updateFragment(wip: FiberNode) {
	const nextChildren = wip.pendingProps
	reconcileChildren(wip, nextChildren)
	return wip.child
}
