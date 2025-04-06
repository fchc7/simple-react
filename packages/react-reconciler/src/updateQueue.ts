/**
 * 初始 fiber => update => 最终 fiber
 * update 由 action 生成，有两种 action
 * 1. 函数，如 setState(x => x + 1)
 * 2. 值，如 setState(1)
 * 所以我们需要一个数据结构需要将 action 存储起来放在 updateQueue 中，并在最终的 fiber 中计算出新的状态
 */

import { Dispatch } from 'react'
import { Action } from 'shared/ReactTypes'
import { Lane } from './fiberLanes'

/**
 * 更新
 */
export interface Update<State> {
	action: Action<State>
	next: Update<any> | null
	lane: Lane
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
export const createUpdate = <State>(
	action: Action<State>,
	lane: Lane,
): Update<State> => {
	return {
		action,
		next: null,
		lane,
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
 * 入队更新，将 update 添加到 updateQueue 的换装 pending 链表中
 * @param updateQueue
 * @param update
 */
export const enqueueUpdate = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>,
) => {
	const pending = updateQueue.shared.pending
	if (pending === null) {
		// pending 为空，说明是第一个 update
		// a -> a
		update.next = update
	} else {
		// pending 不为空，说明不是第一个 update
		// c -> a -> b -> c
		// pending 始终指向最后一个 update，继而这样保证 pending.next 始终指向第一个 update
		update.next = pending.next
		pending.next = update
	}
	updateQueue.shared.pending = update
}

/**
 * 处理更新, 计算出新的状态, 返回给 memoizedState
 * 消费更新任务的优先级
 * @param baseState
 * @param pendingUpdate
 * @param renderLane 当前正在渲染任务的 lane 优先级
 * @returns
 */
export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane,
): { memoizedState: State } => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoizedState: baseState,
	}

	if (pendingUpdate !== null) {
		// 第一个 update
		const first = pendingUpdate.next // 为什么是 next？因为是环状链表 pendingUpdate 始终指向最后一个 update
		let pending = pendingUpdate.next as Update<any>

		do {
			const updateLane = pending.lane
			if (updateLane === renderLane) {
				const action = pending.action
				// 对应改变状态的两种传参 setState(x => x + 1) 和 setState(1)
				if (action instanceof Function) {
					baseState = action(baseState)
				} else {
					baseState = action
				}
			} else {
				// 如果 update 的 lane 不是本次更新的 lane，则跳过
				if (__DEV__) {
					console.warn('不应该进入这个逻辑')
				}
			}

			pending = pending.next as Update<any>
			// 因为 更新链表是环状的，如果 pending 回到 first，说明所有的都执行完毕，则退出循环
		} while (pending !== first)
	}
	result.memoizedState = baseState
	return result
}
