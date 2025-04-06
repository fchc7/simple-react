import { FiberNode } from './fiber'
import { NoFlags, Update } from './fiberFlags'
import {
	appendInitialChild,
	Container,
	createInstance,
	createTextInstance,
} from 'hostConfig'
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
} from './workTags'
import { DOMElement, updateFiberProps } from 'react-dom/src/SyntheticEvent'

/**
 * 标记更新
 * @param fiber
 */
function markUpdate(fiber: FiberNode) {
	fiber.flags = fiber.flags | Update
}

/**
 * 递归生成 FiberNode 树的 归 阶段
 * 1. 对于 Host 类型（HostComponent、HostText）的 FiberNode，构建离屏dom树
 * 2. 收集因更新而产生的副作用，如插入、更新、删除等,
 * 注意，这里的收集的过程有性能优化，利用归阶段向上遍历的流程，将子fiber的副作用冒泡到父fiber中
 * 3. 并返回兄弟或者父级 FiberNode
 * @param fiber 当前正在工作的 FiberNode
 * @returns 兄弟或者父级 FiberNode
 */
export function completeWork(wip: FiberNode): FiberNode | null {
	const newProps = wip.pendingProps
	const current = wip.alternate

	switch (wip.tag) {
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// 更新
				// 1. props是否变化 {onClick: A} {onClick: B}
				// 2. 如果变化，则标记flags update
				// wip.stateNode.container = current.stateNode.container
				// wip.stateNode.domSibling = current.stateNode.domSibling
				updateFiberProps(wip.stateNode as DOMElement, newProps)
			} else {
				// 挂载
				// 1. 构建离屏dom树
				const instance = createInstance(wip.type, newProps)
				// 2. 将离屏dom树插入到当前dom树中
				appendAllChildren(instance, wip)
				wip.stateNode = instance
			}
			bubbleProperties(wip)
			return null
		case HostText:
			if (current !== null && wip.stateNode) {
				// 更新
				const oldText = current.memoizedProps.content
				const newText = newProps.content
				if (oldText !== newText) {
					markUpdate(wip)
				}
			} else {
				// 挂载 构建 DOM
				const instance = createTextInstance(newProps.content)
				wip.stateNode = instance
			}
			bubbleProperties(wip)
			return null

		case HostRoot:
			bubbleProperties(wip)
			return null

		case FunctionComponent:
			bubbleProperties(wip)
			return null
		default:
			if (__DEV__) {
				console.warn('未实现的 completeWork 类型', wip)
			}
			return null
	}
}

/**
 * 将当前 FiberNode 的dom子节点插入到父节点的dom中
 * @param parent 父节点
 * @param wip 当前 FiberNode
 * @returns
 */
function appendAllChildren(parent: Container, wip: FiberNode) {
	let node = wip.child
	while (node) {
		if (node.tag === HostComponent || node.tag === HostText) {
			appendInitialChild(parent, node.stateNode)
		} else if (node.child) {
			node.child.return = node
			node = node.child
			continue
		}
		if (node === wip) {
			return
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return
			}
			node = node?.return
		}
		node.sibling.return = node.return
		node = node.sibling
	}
}

/**
 * 将子fiber的副作用冒泡到父fiber中
 * 这样如果发现某个子树没有副作用就可以跳过了
 * @param wip 当前 FiberNode
 */
function bubbleProperties(wip: FiberNode) {
	let subtreeFlags = NoFlags
	let child = wip.child
	while (child) {
		subtreeFlags |= child.subtreeFlags
		subtreeFlags |= child.flags

		child.return = wip
		child = child.sibling
	}
	wip.subtreeFlags = subtreeFlags
}
