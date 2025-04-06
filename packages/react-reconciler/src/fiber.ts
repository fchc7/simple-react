import { Props, Key, ReactElement } from 'shared/ReactTypes'
import { Fragment, FunctionComponent, HostComponent, WorkTag } from './workTags'
import { Flags, NoFlags } from './fiberFlags'
import { Container } from 'hostConfig'

export class FiberNode {
	tag: WorkTag
	pendingProps: Props
	key: Key
	stateNode: any
	type: any
	return: FiberNode | null
	alternate: FiberNode | null
	child: FiberNode | null
	sibling: FiberNode | null
	index: number
	ref: any
	memoizedProps: Props | null
	flags: Flags
	updateQueue: unknown
	memoizedState: any
	subtreeFlags: Flags
	deletions: FiberNode[] | null

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.tag = tag
		this.pendingProps = pendingProps
		this.key = key || null

		// 不同的type有不同的stateNode
		// 如 HostComponent 的 stateNode 是 DOM 元素
		// 如 ClassComponent 的 stateNode 是组件实例
		this.stateNode = null

		// FunctionComponent 的 type 是函数
		// ClassComponent 的 type 是类
		this.type = null

		/**
		 * 以下是用于描述 FiberNode 的树结构
		 */
		// 父级 FiberNode
		this.return = null
		// 子级 FiberNode
		this.child = null
		// 兄弟级 FiberNode
		this.sibling = null
		// 在父级 FiberNode 中的索引
		this.index = 0

		this.ref = null

		/**
		 * 用于描述 FiberNode 的更新状态，作为工作单元使用的字段
		 */
		// 工作开始时传入的 props
		this.pendingProps = pendingProps
		// 工作完成时，保存的 props
		this.memoizedProps = null
		this.updateQueue = null
		this.memoizedState = null

		// 备用 FiberNode，切换 current（旧，已绘制在屏幕上） 和 workInProgress（新） 的 FiberNode
		this.alternate = null

		// 副作用，当前 FiberNode 需要做的动作，如插入、更新、删除等
		this.flags = NoFlags
		this.subtreeFlags = NoFlags
		this.deletions = null // 需要删除的子级 FiberNode
	}
}

/**
 * ReactDOM.createRoot(rootElement).render(<App />) 时，创建的根节点
 * 得到的数据结构
 *       [FiberRootNode]
 * 			   |      ^
 * 			 current  |
 * 			   |    stateNode
 * 			   v      |
 * 		   [HostRootFiber]  // rootElement 对应的 FiberNode
 * 			   |      ^
 *        child   |
 * 			   |     return
 * 			   v      |
 * 			     [App]
 */

export class FiberRootNode {
	current: FiberNode
	container: Container
	finishedWork: FiberNode | null

	constructor(container: Container, hostRootFiber: FiberNode) {
		// current 指针用于双缓冲切换，实现current 和 workInProgress 的角色互换
		this.current = hostRootFiber
		// 容器信息，如 DOM 元素
		this.container = container
		// 指向了整个更新完成后的 HostRootFiber
		this.finishedWork = null
		hostRootFiber.stateNode = this
	}
}

/**
 * 根据 ReactElement 创建 FiberNode
 * @param element
 * @returns
 */
export const createFiberFromElement = (element: ReactElement): FiberNode => {
	const { type, key, props } = element
	let fiberTag: WorkTag = FunctionComponent

	if (typeof type === 'string') {
		fiberTag = HostComponent
	} else if (typeof type !== 'function' && __DEV__) {
		console.warn('未知的 type 类型', element)
	}

	const fiber = new FiberNode(fiberTag, props, key)

	fiber.type = element.type
	fiber.stateNode = null

	return fiber
}

/**
 * 根据 ReactElement 创建 Fragment FiberNode
 * @param elements
 * @param key
 */
export const createFiberFromFragment = (
	elements: ReactElement[],
	key: Key,
): FiberNode => {
	const fiber = new FiberNode(Fragment, elements, key)
	return fiber
}
