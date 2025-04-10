import { Props, Key, ReactElement } from 'shared/ReactTypes'
import { Fragment, FunctionComponent, HostComponent, WorkTag } from './workTags'
import { Flags, NoFlags } from './fiberFlags'
import { Container } from 'hostConfig'
import { Lane, Lanes, NoLane, NoLanes } from './fiberLanes'
import { Effect } from './fiberHooks'

export class FiberNode {
	// 节点类型和唯一标识
	/** 标记 Fiber 的类型，如 FunctionComponent, ClassComponent, HostRoot 等 */
	tag: WorkTag
	/** Fiber 的唯一标识，用于优化更新过程中的比较策略 */
	key: Key
	/** 元素类型，FunctionComponent 的 type 是函数，ClassComponent 的 type 是类 */
	type: any

	// 状态节点相关
	/**
	 * Fiber 对应的实例，不同的 type 有不同的 stateNode:
	 * - HostComponent 的 stateNode 是 DOM 元素
	 * - ClassComponent 的 stateNode 是组件实例
	 * - HostRoot 的 stateNode 是 FiberRootNode
	 */
	stateNode: any

	// 树结构相关字段
	/** 指向父级 Fiber 节点 */
	return: FiberNode | null
	/** 指向第一个子级 Fiber 节点 */
	child: FiberNode | null
	/** 指向下一个兄弟 Fiber 节点 */
	sibling: FiberNode | null
	/** 在父级 Fiber 子节点列表中的索引位置 */
	index: number

	// 引用相关
	/** React.ref 创建的引用 */
	ref: any

	// 工作循环相关
	/**
	 * 双缓冲技术中的另一个 Fiber 节点
	 * 用于切换 current（旧，已绘制在屏幕上）和 workInProgress（新）
	 */
	alternate: FiberNode | null

	// Props 相关
	/** 新的 props，工作开始时传入的 props */
	pendingProps: Props
	/** 当前渲染使用的 props，工作完成时保存的 props */
	memoizedProps: Props | null

	// 状态和更新相关
	/**
	 * 当前的状态，按组件类型有不同含义:
	 * - 函数组件: Hook 链表的头部，通过 next 链接其他 Hook
	 * - 类组件: 组件实例的状态，通过 this.state 访问
	 * - HostRoot: ReactElement 树，render(<App/>) 传入的组件树
	 */
	memoizedState: any

	/**
	 * 更新队列，按组件类型有不同含义:
	 * - 函数组件: 存储 Effect 链表引用 { lastEffect: Effect | null }
	 * - 类组件/HostRoot: 存储状态更新队列，包含待处理的更新
	 */
	updateQueue: unknown

	// 副作用标记
	/**
	 * 当前 Fiber 的副作用标记，
	 * 表示当前 Fiber 节点需要进行的操作，如 Placement, Update, Deletion 等
	 */
	flags: Flags
	/**
	 * 子树的副作用标记，
	 * 表示子树中包含需要进行操作的节点
	 */
	subtreeFlags: Flags
	/** 需要删除的子级 Fiber 节点列表 */
	deletions: FiberNode[] | null

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.tag = tag
		this.pendingProps = pendingProps
		this.key = key || null

		this.stateNode = null

		this.type = null

		this.return = null

		this.child = null

		this.sibling = null

		this.index = 0

		this.ref = null

		this.pendingProps = pendingProps

		this.memoizedProps = null
		this.updateQueue = null
		this.memoizedState = null

		this.alternate = null

		this.flags = NoFlags
		this.subtreeFlags = NoFlags
		this.deletions = null
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

/**
 * 保存本次更新中需要执行的 useEffect 的销毁函数和创建函数
 */
export type PendingPassiveEffects = {
	unmount: Effect[]
	update: Effect[]
}

export class FiberRootNode {
	current: FiberNode
	container: Container
	finishedWork: FiberNode | null
	pendingLanes: Lanes
	finishedLane: Lane
	pendingPassiveEffects: PendingPassiveEffects

	constructor(container: Container, hostRootFiber: FiberNode) {
		// current 指针用于双缓冲切换，实现current 和 workInProgress 的角色互换
		this.current = hostRootFiber
		// 容器信息，如 DOM 元素
		this.container = container
		// 指向了整个更新完成后的 HostRootFiber
		this.finishedWork = null
		hostRootFiber.stateNode = this

		// 所有没有被消费的lane的集合，每次更新通过调度都会选出一个高优先级 lane 的更新批量进行消费
		this.pendingLanes = NoLanes
		// 本次更新消费的lane
		this.finishedLane = NoLane
		this.pendingPassiveEffects = {
			unmount: [],
			update: [],
		}
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
