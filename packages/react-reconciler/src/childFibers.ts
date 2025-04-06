import { Props, ReactElement } from 'shared/ReactTypes'
import { createFiberFromElement, FiberNode } from './fiber'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { ChildDeletion, Placement } from './fiberFlags'
import { HostText } from './workTags'
import { createWorkInProgress } from './workLoop'

/**
 * 闭包函数，根据 shouldTrackSideEffects 参数，决定是否跟踪副作用
 * 作用是进行性能优化，将多级节点的多次标记副作用，优化为一次标记，构建好离屏dom树后，对div进行一次Placement
 * @example
 * const el = <div>
 * 	<span>123</span>
 * 	<p>456</p>
 * </div>
 *  // 对于以上的节点，正常来说会进行5次副作用标记 flags：
 * 1. div 的 Placement
 * 2. span 的 Placement
 * 3. span 的 123 Placement
 * 4. p 的 Placement
 * 5. p 的 456 Placement
 *
 * 但对于挂载来说，只需要标记一次最外层的节点的 Placement 就行了
 *
 * 如果 shouldTrackSideEffects 为 true，则标记 5 次
 * 如果 shouldTrackSideEffects 为 false，则标记 1 次
 * @param shouldTrackSideEffects
 * @returns
 */
function ChildReconciler(shouldTrackSideEffects: boolean) {
	/**
	 * 标记删除子级 FiberNode
	 * @param returnFiber
	 * @param childToDelete
	 */
	function deleteChildFibers(returnFiber: FiberNode, childToDelete: FiberNode) {
		if (!shouldTrackSideEffects) {
			return
		}

		const deletions = returnFiber.deletions
		if (deletions === null) {
			returnFiber.deletions = [childToDelete]
			returnFiber.flags = returnFiber.flags | ChildDeletion // 标记删除
		} else {
			deletions.push(childToDelete)
		}
	}

	function placeSingleChild(fiber: FiberNode) {
		// 在初次挂载时，fiber.alternate 为 null，所以需要标记 Placement
		if (shouldTrackSideEffects && fiber.alternate === null) {
			fiber.flags = fiber.flags | Placement
		}
		return fiber
	}

	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentChild: FiberNode | null,
		newChild: ReactElement,
	) {
		const key = newChild.key

		// update 阶段
		work: if (currentChild !== null) {
			// 如果key相同，则复用fiber
			if (currentChild.key === key) {
				if (newChild.$$typeof === REACT_ELEMENT_TYPE) {
					// key 相同，且 type 相同，则复用fiber, wip
					if (newChild.type === currentChild.type) {
						const existing = useFiber(currentChild, newChild.props)
						existing.return = returnFiber
						return existing
					}
					// key 相同，但是 type 不同，则也要删除旧的fiber
					deleteChildFibers(returnFiber, currentChild)
					break work
				} else {
					if (__DEV__) {
						console.warn('未实现的 React 类型', newChild)
						break work
					}
				}
			} else {
				// 如果key不同，则标记删除旧的fiber
				deleteChildFibers(returnFiber, currentChild)
			}
		}

		// 根据 element 类型，创建fiber
		const childFiber = createFiberFromElement(newChild)
		childFiber.return = returnFiber
		return childFiber
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentChild: FiberNode | null,
		content: string | number,
	) {
		// update 阶段
		if (currentChild !== null) {
			if (currentChild.tag === HostText) {
				// 类型没有变化，则复用fiber
				const existing = useFiber(currentChild, { content })
				existing.return = returnFiber
				return existing
			}
			deleteChildFibers(returnFiber, currentChild)
		}
		const childFiber = new FiberNode(HostText, { content }, null)
		childFiber.return = returnFiber
		return childFiber
	}

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentChild: FiberNode | null,
		newChild?: ReactElement,
	): FiberNode | null {
		// 根据 newChild 的类型，进行不同的处理
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentChild, newChild),
					)
				default:
					if (__DEV__) {
						console.warn('未实现的 reconcileChildFibers 类型', newChild)
					}
					return null
			}
		}

		// TODO 多节点的情况 ul>li*3

		// HostText
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentChild, newChild),
			)
		}

		// 兜底删除
		if (currentChild !== null) {
			deleteChildFibers(returnFiber, currentChild)
		}

		if (__DEV__) {
			console.warn('未实现的 reconcileChildFibers 类型', newChild)
		}

		return null
	}
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
	const clone = createWorkInProgress(fiber, pendingProps)
	clone.index = 0
	clone.sibling = null
	return clone
}

/**
 * 在更新阶段，我们需要精确追踪每个节点的变化，以便能够仅更新发生变化的部分，所以需要为每个节点标记相应的副作用。
 */
export const reconcileChildFibers = ChildReconciler(true)

/**
 * 初次挂载组件时使用，不追踪单个子元素的副作用，
 * 只需要标记最外层的 div 节点，然后一次性将整个树挂载到 DOM 中更高效
 */
export const mountChildFibers = ChildReconciler(false)
