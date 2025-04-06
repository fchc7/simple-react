import { FiberNode, FiberRootNode } from './fiber'
import {
	ChildDeletion,
	MutationMask,
	NoFlags,
	Placement,
	Update,
} from './fiberFlags'
import {
	appendChildToContainer,
	commitUpdate,
	Container,
	removeChild,
} from 'hostConfig'
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
} from './workTags'

let nextEffect: FiberNode | null = null

/**
 * 在 commit 的 mutation 阶段执行各种副作用
 * @param finishedWork
 */
export function commitMutationEffects(finishedWork: FiberNode) {
	nextEffect = finishedWork

	// 深度优先遍历，找到需要执行flags的子节点
	while (nextEffect !== null) {
		// 向下遍历
		const child = nextEffect.child

		// 如果当前节点的子树存在需要执行flags的子节点，则继续向下遍历
		if (
			(nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			nextEffect = child
		} else {
			// 否则向上遍历，先处理兄弟，然后找父级
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect)
				const sibling = nextEffect.sibling
				if (sibling !== null) {
					nextEffect = sibling
					break up
				}
				nextEffect = nextEffect.return
			}
		}
	}
}

function commitMutationEffectsOnFiber(finishedWork: FiberNode) {
	const flags = finishedWork.flags

	// 如果当前节点需要执行 Placement 操作
	if ((flags & Placement) !== NoFlags) {
		commitPlacement(finishedWork)
		// 完成了 Placement 操作，清除 Placement 标志
		finishedWork.flags &= ~Placement
	}

	// 如果当前节点需要执行 Update 操作
	if ((flags & Update) !== NoFlags) {
		commitUpdate(finishedWork)
		// 完成了 Update 操作，清除 Update 标志
		finishedWork.flags &= ~Update
	}

	// 如果当前节点的子节点需要执行 Deletion 操作
	if ((flags & ChildDeletion) !== NoFlags) {
		const deletions = finishedWork.deletions
		if (deletions !== null) {
			deletions.forEach((child) => {
				commitDeletion(child)
			})
		}
		// 完成了 Deletion 操作，清除 Deletion 标志
		finishedWork.flags &= ~ChildDeletion
	}
}

/**
 * 执行卸载相关的逻辑操作，并在最后移除dom
 * @example
 * function App() {
 * 	return <p>hello</p>
 * }
 *
 * <main>
 * 	<App />
 * 	<button>click me</button>
 * </main>
 *
 * 卸载的顺序为（非移除dom，只是执行对应的卸载逻辑），大体是深度优先遍历
 * 1. main
 * 2. App
 * 3. p
 * 4. button
 *
 * @param childToDelete 需要被卸载的子树的根节点
 */
function commitDeletion(childToDelete: FiberNode) {
	let rootHostNode: FiberNode | null = null // 需要被卸载的子树的根节点

	// 递归子树
	commitNestedComponent(childToDelete, (unmountFiber) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				if (rootHostNode === null) {
					rootHostNode = unmountFiber
				}
				// TODO 解绑 ref
				break
			case HostText:
				if (rootHostNode === null) {
					rootHostNode = unmountFiber
				}
				break
			case FunctionComponent:
				// TODO useEffect unmount
				break
			default:
				if (__DEV__) {
					console.warn('未找到类型的卸载操作', unmountFiber)
				}
				break
		}
	})

	// 移除 rootHostComponent 的 DOM
	if (rootHostNode !== null) {
		const hostParent = getHostParent(childToDelete)
		if (hostParent !== null) {
			removeChild((rootHostNode as FiberNode).stateNode, hostParent)
		}
	}

	// 断开与父级的连接
	childToDelete.return = null
	childToDelete.child = null
}

/**
 * 递归遍历子树，执行卸载操作
 * @param root 当前需要卸载的子树的根节点
 * @param onCommitUnmount 卸载操作的回调函数
 */
function commitNestedComponent(
	root: FiberNode,
	onCommitUnmount: (fiber: FiberNode) => void,
) {
	let node = root
	while (true) {
		onCommitUnmount(node)

		if (node.child !== null) {
			// 向下遍历
			node.child.return = node
			node = node.child
			continue
		}

		// 终止条件
		if (node === root) {
			return
		}

		// 向上遍历
		while (node.sibling === null) {
			if (node.return === null || node.return === root) {
				return
			}
			// 向上归
			node = node.return
		}
		node.sibling.return = node.return
		node = node.sibling
	}
}

function commitPlacement(finishedWork: FiberNode) {
	if (__DEV__) {
		console.warn('commit阶段的Placement', finishedWork)
	}

	// 获取宿主环境下的父级节点
	const hostParent = getHostParent(finishedWork)
	if (hostParent === null) {
		if (__DEV__) {
			console.warn('未找到 host parent')
		}
		return
	}

	// 找到当前 fiber 对应的dom	，然后插入到父级节点
	appendPlacementNodeIntoContainer(finishedWork, hostParent)
}

/**
 * 获取宿主环境下的父级节点，浏览器下就是 DOM 节点
 * @param finishedWork
 * @returns
 */
function getHostParent(finishedWork: FiberNode): Container | null {
	let parent = finishedWork.return
	while (parent !== null) {
		if (parent.tag === HostComponent) {
			return parent.stateNode as Container
		}

		if (parent.tag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container
		}

		parent = parent.return
	}

	if (__DEV__) {
		console.warn('未找到 host parent')
	}
	return null
}

/**
 * 将 Placement 节点插入到宿主环境下的父级节点
 * 该过程同样是DFS，先向下后向上，找出所有的 Host 类型的节点，然后插入到宿主环境下的父级节点
 * @param finishedWork
 * @param hostParent
 * @returns
 */
function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container,
) {
	const isHost =
		finishedWork.tag === HostComponent || finishedWork.tag === HostText
	if (isHost) {
		appendChildToContainer(hostParent, finishedWork.stateNode)
		return
	}

	const child = finishedWork.child
	if (child !== null) {
		appendPlacementNodeIntoContainer(child, hostParent)
		let sibling = child.sibling

		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, hostParent)
			sibling = sibling.sibling
		}
	}
}
