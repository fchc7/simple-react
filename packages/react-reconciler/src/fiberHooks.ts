import { Action, ReactElement } from 'shared/ReactTypes'
import { FiberNode } from './fiber'
import internals from 'shared/internals'
import { Dispatcher } from 'react/src/currentDispatcher'
import { Dispatch } from 'react'
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdateQueue,
	UpdateQueue,
} from './updateQueue'
import { scheduleUpdateOnFiber } from './workLoop'
import { Lane, NoLane, requestUpdateLane } from './fiberLanes'

const { currentDispatcher } = internals
let renderLane: Lane = NoLane

/**
 * hook 是作为链表结构存放在 fiber 的 memoizedState 属性中
 * 然后会发现，在 hook 的数据结构当中，也和 fiber 一样，有 memoizedState 属性，保持了统一
 */
interface Hook {
	memoizedState: any
	updateQueue: unknown
	next: Hook | null
}

let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null

/**
 * render阶段向下递归处理函数组件的时候，会调用此方法
 * @param wip 当前正在渲染的 fiber 节点
 * @param renderLane 当前正在渲染任务的 lane
 * @returns
 */
export function renderWithHooks(wip: FiberNode, lane: Lane): ReactElement {
	// 赋值当前正在渲染的 fiber 节点
	currentlyRenderingFiber = wip
	// 重置 hooks 链表
	wip.memoizedState = null
	workInProgressHook = null
	// 重置 currentHook，确保每次更新都从头开始
	currentHook = null
	renderLane = lane

	const current = wip.alternate
	if (current !== null) {
		// update
		currentDispatcher.current = HooksDispatcherOnUpdate
	} else {
		// mount
		// 因为不同阶段的同名hook的实现不同，所以需要根据当前阶段来决定使用哪个实现
		currentDispatcher.current = HooksDispatcherOnMount
	}

	const Component = wip.type
	const props = wip.pendingProps
	const children = Component(props)

	// 重置
	currentlyRenderingFiber = null
	workInProgressHook = null
	currentHook = null
	renderLane = NoLane
	return children
}

/**
 * 挂载阶段的 hooks 实现
 */
const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState,
}

/**
 * update阶段的hooks实现
 */
const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
}

/**
 * 挂载阶段的useState实现，初始值（initialState）只在组件的初始渲染中使用，后续渲染会忽略它。
 * @param initialState
 * @returns
 */
function mountState<State>(
	initialState: State | (() => State),
): [State, Dispatch<State>] {
	// 找到当前useState对应的hook数据
	const hook = mountWorkInProgressHook()
	let memoizedState
	if (initialState instanceof Function) {
		memoizedState = initialState()
	} else {
		memoizedState = initialState
	}

	const queue = createUpdateQueue<State>()
	hook.updateQueue = queue
	hook.memoizedState = memoizedState

	// @ts-expect-error 忽略类型错误
	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber!, queue)
	queue.dispatch = dispatch as Dispatch<State>

	return [memoizedState, dispatch]
}

/**
 * 生成新的hook，并且组成hooks的链表
 * @returns
 */
function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null,
	}
	if (workInProgressHook === null) {
		// 说明是 mount 阶段第一个hook
		if (currentlyRenderingFiber === null) {
			throw new Error('在函数组件中调用hook')
		} else {
			workInProgressHook = hook
			currentlyRenderingFiber.memoizedState = workInProgressHook
		}
	} else {
		// 说明是 mount 阶段非第一个hook, 将当前hook的next指向新的hook
		workInProgressHook.next = hook
		workInProgressHook = hook
	}
	return workInProgressHook
}

/**
 * update阶段的useState实现，注意这里忽略了传入值
 * @returns
 */
function updateState<State>(): [State, Dispatch<State>] {
	// 找到当前useState对应的hook数据
	const hook = updateWorkInProgressHook()

	// 计算新的state的逻辑
	const queue = hook.updateQueue as UpdateQueue<State>
	const pending = queue.shared.pending
	// 清空 pending，否则会导致多次更新的时候，pending 会累加
	queue.shared.pending = null

	if (pending !== null) {
		const { memoizedState } = processUpdateQueue(
			hook.memoizedState,
			pending,
			renderLane,
		)
		hook.memoizedState = memoizedState
	}

	return [hook.memoizedState, queue.dispatch as Dispatch<State>]
}

function updateWorkInProgressHook(): Hook {
	// TODO render 阶段触发的更新

	let nextCurrentHook: Hook | null = null
	if (currentHook === null) {
		// 这是这个 FC update 时，第一次调用 hook
		const current = (currentlyRenderingFiber as FiberNode).alternate
		if (current !== null) {
			nextCurrentHook = current.memoizedState
		} else {
			// 说明是 mount 阶段
			nextCurrentHook = null
		}
	} else {
		// 说明是 update 阶段非第一个hook
		nextCurrentHook = currentHook.next
	}

	if (nextCurrentHook === null) {
		// 上一次  u1 u2 u3
		// 这一次  u1 u2 u3 u4
		throw new Error(
			`组件${currentlyRenderingFiber?.type} 的 hooks 数量超过了预期`,
		)
	}

	currentHook = nextCurrentHook as Hook

	const newHook: Hook = {
		memoizedState: currentHook.memoizedState,
		updateQueue: currentHook.updateQueue,
		next: null,
	}

	if (workInProgressHook === null) {
		// 说明是 mount 阶段第一个hook
		if (currentlyRenderingFiber === null) {
			throw new Error('在函数组件中调用hook')
		} else {
			workInProgressHook = newHook
			currentlyRenderingFiber.memoizedState = workInProgressHook
		}
	} else {
		// 说明是 mount 阶段非第一个hook, 将当前hook的next指向新的hook
		workInProgressHook.next = newHook
		workInProgressHook = newHook
	}
	return workInProgressHook
}

function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>,
) {
	const lane = requestUpdateLane()
	const update = createUpdate(action, lane)
	enqueueUpdate(updateQueue, update)
	scheduleUpdateOnFiber(fiber, lane)
}
