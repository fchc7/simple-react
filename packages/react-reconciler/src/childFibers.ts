import { Key, Props, ReactElement } from 'shared/ReactTypes'
import {
	createFiberFromElement,
	createFiberFromFragment,
	FiberNode,
} from './fiber'
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols'
import { ChildDeletion, Placement } from './fiberFlags'
import { Fragment, HostText } from './workTags'
import { createWorkInProgress } from './workLoop'

type ExistingChildren = Map<string | number, FiberNode>

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

	/**
	 * 标记删除传入的 currentChild 的其余兄弟节点 FiberNode。
	 * 之前同层级 ABCD => 更新后 B，传入 currentChild = C，标记 D
	 * @param returnFiber 父级 FiberNode
	 * @param currentChild 当前子级 FiberNode
	 */
	function deleteRemainingChildren(
		returnFiber: FiberNode,
		currentChild: FiberNode | null,
	) {
		if (!shouldTrackSideEffects) {
			return
		}
		let childToDelete = currentChild
		while (childToDelete !== null) {
			deleteChildFibers(returnFiber, childToDelete)
			childToDelete = childToDelete.sibling
		}
	}

	function placeSingleChild(fiber: FiberNode) {
		// 在初次挂载时，fiber.alternate 为 null，所以需要标记 Placement
		if (shouldTrackSideEffects && fiber.alternate === null) {
			fiber.flags = fiber.flags | Placement
		}
		return fiber
	}

	/**
	 * 处理更新后为单节点的情况，其中有diff和标记副作用
	 * @param returnFiber 父级 FiberNode
	 * @param currentChild 当前子级 FiberNode
	 * @param newChild 新的 ReactElement
	 * @returns 返回新的 FiberNode
	 */
	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentChild: FiberNode | null,
		newChild: ReactElement,
	) {
		const key = newChild.key

		// update 阶段，遍历旧的所有的兄弟节点，处理diff并且进行标记
		while (currentChild !== null) {
			// 如果key相同，则复用fiber
			if (currentChild.key === key) {
				if (newChild.$$typeof === REACT_ELEMENT_TYPE) {
					// key 相同，且 type 相同，则复用fiber, wip
					if (newChild.type === currentChild.type) {
						let props = newChild.props
						// 上面已经处理了最外层为 Fragment 的情况，所以这里需要处理组件中子节点为 Fragment 的情况
						// 如 <div><Fragment><span>123</span></Fragment></div>
						// 都是将子节点作为新的 newChild，去掉外层的 Fragment
						if (newChild.type === REACT_FRAGMENT_TYPE) {
							props = newChild.props.children
						}

						const existing = useFiber(currentChild, props)
						existing.return = returnFiber
						// 当前节点可以复用，标记之前的其余的同级节点可以删除
						deleteRemainingChildren(returnFiber, currentChild.sibling)
						return existing
					}
					// key 相同，但是 type 不同，则删除所有旧的
					deleteRemainingChildren(returnFiber, currentChild.sibling)
					break
				} else {
					if (__DEV__) {
						console.warn('未实现的 React 类型', newChild)
						break
					}
				}
			} else {
				// 如果key不同，则标记删除这个fiber，继续遍历剩余的旧的兄弟节点
				deleteChildFibers(returnFiber, currentChild)
				currentChild = currentChild.sibling
			}
		}

		// 根据 element 类型，创建fiber
		let childFiber
		if (newChild.type === REACT_FRAGMENT_TYPE) {
			childFiber = createFiberFromFragment(newChild.props.children, key)
		} else {
			childFiber = createFiberFromElement(newChild)
		}
		childFiber.return = returnFiber
		return childFiber
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentChild: FiberNode | null,
		content: string | number,
	) {
		// update 阶段
		while (currentChild !== null) {
			if (currentChild.tag === HostText) {
				// 类型没有变化，则复用fiber
				const existing = useFiber(currentChild, { content })
				existing.return = returnFiber
				deleteRemainingChildren(returnFiber, currentChild.sibling)
				return existing
			}
			deleteChildFibers(returnFiber, currentChild)
			currentChild = currentChild.sibling
		}
		const childFiber = new FiberNode(HostText, { content }, null)
		childFiber.return = returnFiber
		return childFiber
	}

	/**
	 * 处理多节点的情况 ul>li*3
	 * @param returnFiber 父级 FiberNode
	 * @param currentFirstChild 当前第一个子级 FiberNode
	 * @param newChildren 新的 ReactElement 的数组
	 * @returns 返回第一个fiber
	 */
	function reconcileChildrenArray(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null,
		newChildren: ReactElement[],
	): FiberNode | null {
		// 最后一个可复用fiber在current中的位置
		let lastPlacedIndex: number = 0
		// 创建的最后一个fiber
		let lastNewFiber: FiberNode | null = null
		// 创建的第一个fiber
		let firstNewFiber: FiberNode | null = null

		// 1. 将current遍历保存在map中
		const existingChildren: ExistingChildren = new Map() // {[key]: fiber}
		let current = currentFirstChild
		while (current !== null) {
			const keyToUse = current.key !== null ? current.key : current.index // {key: fiber}
			existingChildren.set(keyToUse, current)
			current = current.sibling
		}

		for (let i = 0; i < newChildren.length; i++) {
			// 2. 遍历newChildren，寻找可复用
			const after = newChildren[i]

			const newFiber = updateFromMap(existingChildren, returnFiber, i, after)
			if (newFiber === null) {
				continue
			}

			// 3. 标记移动还是插入
			newFiber.index = i
			newFiber.return = returnFiber

			if (lastNewFiber === null) {
				lastNewFiber = newFiber
				firstNewFiber = newFiber
			} else {
				lastNewFiber.sibling = newFiber
				lastNewFiber = lastNewFiber.sibling
			}

			if (!shouldTrackSideEffects) {
				continue
			}

			const current = newFiber.alternate
			if (current !== null) {
				const oldIndex = current.index
				if (oldIndex < lastPlacedIndex) {
					// 标记移动 Placement
					newFiber.flags |= Placement
					continue
				} else {
					// 相对于前一节点来说，未移动
					lastPlacedIndex = oldIndex
				}
			} else {
				// 不存在，则标记插入Placement
				newFiber.flags |= Placement
			}
		}

		// 4. 将map中剩下的节点标记为删除
		existingChildren.forEach((fiber) => {
			deleteChildFibers(returnFiber, fiber)
		})

		return firstNewFiber
	}

	/**
	 * 根据 key 和 index 复用或新建节点，
	 * 如果返回的是 null，则表明更新后的内容为 false 或者 null
	 * @param existingChildren 旧的节点
	 * @param returnFiber 父级 FiberNode
	 * @param newIdx 新的 index
	 * @param newChild 新的 ReactElement
	 * @returns 返回新的 FiberNode
	 */
	function updateFromMap(
		existingChildren: ExistingChildren,
		returnFiber: FiberNode,
		newIdx: number,
		newChild: any,
	): FiberNode | null {
		const keyToUse = newChild.key !== null ? newChild.key : newIdx
		// 更新前存在节点
		const before = existingChildren.get(keyToUse)
		// 处理 HostText
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			if (before) {
				if (before.tag === HostText) {
					existingChildren.delete(keyToUse)
					return useFiber(before, { content: newChild + '' })
				}
			}
			// 不存在，则创建新的fiber
			return new FiberNode(HostText, { content: newChild }, null)
		}

		// 处理 ReactElement
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					if (newChild.type === REACT_FRAGMENT_TYPE) {
						return updateFragment(
							returnFiber,
							before,
							newChild.props.children,
							keyToUse,
							existingChildren,
						)
					}
					if (before) {
						if (before.type === newChild.type) {
							existingChildren.delete(keyToUse)
							return useFiber(before, newChild.props)
						}
					}
					return createFiberFromElement(newChild)
				default:
					if (__DEV__) {
						console.warn('未实现的 reconcileChildFibers 类型', newChild)
					}
					break
			}

			// 如果是数组类型，则当作 Fragment 处理
			if (Array.isArray(newChild)) {
				return updateFragment(
					returnFiber,
					before,
					newChild,
					keyToUse,
					existingChildren,
				)
			}
		}

		return null
	}

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentChild: FiberNode | null,
		newChild?: ReactElement,
	): FiberNode | null {
		// 处理组件中顶层 Fragment 的情况，此时作为外层包裹的 Fragment 是没有 key 的
		const isUnkeyedTopLevelFragment =
			newChild &&
			typeof newChild === 'object' &&
			newChild.type === REACT_FRAGMENT_TYPE &&
			newChild.key === null
		if (isUnkeyedTopLevelFragment) {
			// 将 Fragment 的子节点作为新的 newChild，
			// 如 <><div>123</div></> 会被编译为
			// jsx(Fragment, {
			// 	children: [
			// 		jsx('div', {
			// 			children: '123'
			// 		})
			// 	]
			// })
			newChild = newChild?.props.children
		}

		// 根据 newChild 的类型，进行不同的处理
		if (typeof newChild === 'object' && newChild !== null) {
			// 处理多节点的情况 ul>li*3
			if (Array.isArray(newChild)) {
				return reconcileChildrenArray(returnFiber, currentChild, newChild)
			}

			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentChild, newChild),
					)
				default:
					if (__DEV__) {
						console.warn('未实现的 reconcileChildFibers 类型', newChild)
						return null
					}
			}
		}

		// HostText
		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentChild, newChild),
			)
		}

		// 兜底删除
		if (currentChild !== null) {
			deleteRemainingChildren(returnFiber, currentChild)
		}

		if (__DEV__) {
			console.warn('未实现的 reconcileChildFibers 类型', newChild)
		}

		return null
	}
}

/**
 * 复用旧的 fiber
 * @param fiber 旧的 fiber
 * @param pendingProps 新的 props
 * @returns 新的 fiber
 */
function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
	const clone = createWorkInProgress(fiber, pendingProps)
	clone.index = 0
	clone.sibling = null
	return clone
}

function updateFragment(
	returnFiber: FiberNode,
	current: FiberNode | undefined,
	elements: ReactElement[],
	fragmentKey: Key,
	existingChildren: ExistingChildren,
) {
	let fiber
	if (!current || current.tag !== Fragment) {
		fiber = createFiberFromFragment(elements, fragmentKey)
	} else {
		existingChildren.delete(fragmentKey)
		fiber = useFiber(current, elements)
	}

	fiber.return = returnFiber
	return fiber
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
