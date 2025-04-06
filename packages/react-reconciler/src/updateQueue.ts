/**
 * 初始 fiber => update => 最终 fiber
 * update 由 action 生成，有两种 action
 * 1. 函数，如 setState(x => x + 1)
 * 2. 值，如 setState(1)
 * 所以我们需要一个数据结构需要将 action 存储起来放在 updateQueue 中，并在最终的 fiber 中计算出新的状态
 */

import { Dispatch } from 'react'
import { Action } from 'shared/ReactTypes'

/**
 * 更新
 */
export interface Update<State> {
	action: Action<State>
}

/**
 * 更新队列
 */
export interface UpdateQueue<State> {
	// 为什么是一个对象？这样可以 current 和 wip 共享一个 updateQueue
	shared: {
		pending: Update<State> | null
	}
	dispatch: Dispatch<State> | null
}

/**
 * 创建更新
 * @param action
 * @returns
 */
export const createUpdate = <State>(action: Action<State>): Update<State> => {
	return {
		action,
	}
}

/**
 * 创建更新队列
 * @param initialState
 * @returns
 */
export const createUpdateQueue = <State>() => {
	return {
		shared: {
			pending: null,
		},
		dispatch: null,
	} as unknown as UpdateQueue<State>
}

/**
 * 入队更新
 * @param updateQueue
 * @param update
 */
export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>,
) => {
	updateQueue.shared.pending = update
}

/**
 * 处理更新, 计算出新的状态, 返回给 memoizedState
 * @param baseState
 * @param pendingUpdate
 * @returns
 */
export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
): { memoizedState: State } => {
	const result = { memoizedState: baseState }
	if (pendingUpdate !== null) {
		const action = pendingUpdate.action
		if (action instanceof Function) {
			result.memoizedState = action(baseState)
		} else {
			result.memoizedState = action
		}
	}
	return result
}
