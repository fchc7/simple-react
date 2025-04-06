import { Props } from 'shared/ReactTypes'
import { beginWork } from './beginWork'
import { completeWork } from './completeWork'
import { FiberNode, FiberRootNode } from './fiber'
import { HostRoot } from './workTags'
import { MutationMask, NoFlags } from './fiberFlags'
import { commitMutationEffects } from './commitWork'
import {
	getHighestPriorityLane,
	Lane,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane,
} from './fiberLanes'
import { scheduleSyncCallback, flushSyncCallbacks } from './syncTaskQueue'
import { scheduleMicroTask } from 'hostConfig'

// 当前正在工作的 FiberNode，全局变量
let workInProgress: FiberNode | null = null

let wipRootRenderLane: Lane = NoLane

/**
 * 调度更新，最终从根节点开始，创建(或复用)一个工作单元，从而构建一个 workInProgress(WIP) 树
 * @param fiber
 */
export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	const root = markUpdateLaneFromFiberToRoot(fiber)
	markRootUpdated(root, lane) // 将本次更新 lane 添加到 root 的 pendingLanes 中
	ensureRootIsScheduled(root)
}

/**
 * 将本次更新 lane 添加到 FiberRootNode 的 pendingLanes 中
 * @param root
 * @param lane
 */
function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

/**
 * 调度阶段的入口
 * 从根节点开始调度任务，在这里会根据优先级来决定使用微任务还是宏任务
 * @param root
 */
function ensureRootIsScheduled(root: FiberRootNode) {
	const pendingLanes = root.pendingLanes
	const updateLane = getHighestPriorityLane(pendingLanes)
	if (updateLane === NoLane) {
		// 没有 lane 就代表没有更新
		return
	}

	if (updateLane === SyncLane) {
		// 同步优先级，使用微任务调度
		if (__DEV__) {
			console.log('在微任务中调度同步任务，优先级：', updateLane)
		}
		// 将更新任务添加到同步任务队列中，意味着一次 3次 setState 就会产生：
		// [performSyncWorkOnRoot, performSyncWorkOnRoot, performSyncWorkOnRoot]
		// 那是不是意味着三次从根节点开始的 render 阶段呢？
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane)) // 使用 bind 实现闭包绑定参数
		// 使用宿主环境下的微任务去执行任务, 在清空同步任务队列时，就会执行3次 performSyncWorkOnRoot
		// 由于我们使用了一个变量开关 isFlushingSyncQueue 来控制是否正在执行，所以后两次都被跳过，所以这里实现了合并，只执行一次从根节点开始的更新
		// 但由于 setState 产生的 update 任务是一个链表挂载在节点上，所以在一次更新的时候还是会将所有 update 任务执行完毕，意味着3次setState还是会执行
		// 完成了 3次 触发更新，但是更新流程只走一遍
		scheduleMicroTask(flushSyncCallbacks)
	} else {
		// 其他优先级，使用宏任务调度
	}
}

/**
 * 从当前 FiberNode 向上找到根节点
 * 因为所有的更新都是从根节点开始的，所以需要找到根节点，可以参考 FiberRootNode 说明
 * @param fiber
 * @returns
 */
function markUpdateLaneFromFiberToRoot(fiber: FiberNode) {
	let node = fiber
	let parent = node.return
	while (parent !== null) {
		node = parent
		parent = parent.return
	}
	if (node.tag === HostRoot) {
		return node.stateNode
	}
	return null
}

/**
 * 设置更新流程入口的工作单元，即 HostRootFiber ，可以参考 FiberRootNode 说明
 * @param root
 */
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
	wipRootRenderLane = lane
	workInProgress = createWorkInProgress(root.current, {})
}

/**
 * 创建一个新的工作单元，或者通过双缓冲机制复用已有的工作单元
 * @param current
 * @param pendingProps
 * @returns
 */
export function createWorkInProgress(
	current: FiberNode,
	pendingProps: Props,
): FiberNode {
	let wip = current.alternate
	if (wip === null) {
		// 创建一个新的工作单元，其实就是 mount 阶段，因为没有双缓冲的另外一个通道的节点
		wip = new FiberNode(current.tag, pendingProps, current.key)
		wip.stateNode = current.stateNode
		// 指针互相指向，双缓冲机制，current 是老的，wip 是新的
		wip.alternate = current
		current.alternate = wip
	} else {
		// 通过双缓冲机制复用已有的工作单元，其实就是 update 阶段
		wip.pendingProps = pendingProps
		// 清除副作用
		wip.flags = NoFlags
		wip.subtreeFlags = NoFlags
		wip.deletions = null
	}

	// 复用节点的属性
	wip.type = current.type
	wip.updateQueue = current.updateQueue
	wip.child = current.child
	wip.memoizedProps = current.memoizedProps
	wip.memoizedState = current.memoizedState

	return wip
}

/**
 * 这是同步更新的入口
 * 触发更新渲染，开始递归生成 Fiber 树的工作
 * 有哪一些情况会触发渲染？
 * 1. 根节点 createRoot().render() 时
 * 2. 状态更新时，如 setState 或者 useState 的 dispatchAction 等
 * 这两种情况的入口不同，一个是根节点，一个是组件内部
 * 但是更新流程都是需要从根节点开始，所以需要一个入口函数
 * @param root
 */
function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriorityLane(root.pendingLanes)
	if (nextLane !== SyncLane) {
		// 其他比 SyncLane 低的优先级
		ensureRootIsScheduled(root)
		return
	}

	if (__DEV__) {
		console.warn('render 阶段开始', root)
	}

	// 初始化
	prepareFreshStack(root, lane)

	do {
		try {
			workLoop()
		} catch (e) {
			workInProgress = null
			if (__DEV__) {
				console.warn('workLoop 发生错误', e)
			}
		}
	} while (workInProgress !== null)

	// 递归完成，拿到最新的 WIP 树，并赋值给 finishedWork，完成 commit 阶段
	// finishedWork 是本次更新后的根节点
	const finishedWork = root.current.alternate
	root.finishedWork = finishedWork
	root.finishedLane = lane // 记录本次更新的 lane
	wipRootRenderLane = NoLane

	// render 阶段结束，开始 commit 阶段
	commitRoot(root)
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress)
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLane)
	// 保存工作开始时的 props
	fiber.memoizedProps = fiber.pendingProps

	// 没有子级，则开始归阶段
	if (next === null) {
		completeUnitOfWork(fiber)
	} else {
		workInProgress = next
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber

	while (node !== null) {
		completeWork(node)
		const sibling = node.sibling
		if (sibling !== null) {
			workInProgress = sibling
			return
		}
		node = node.return
		workInProgress = node
	}
}

/**
 * 开始提交阶段: render(reconciler) => commit
 * 分为三个子阶段
 * 1. beforeMutation
 * 2. mutation
 * 3. layout
 * @param root
 */
function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork
	if (finishedWork === null) {
		return
	}

	if (__DEV__) {
		console.warn('commit 阶段开始', finishedWork)
	}

	const lane = root.finishedLane

	if (lane === NoLane && __DEV__) {
		console.error('commit 阶段 lane 为 NoLane，不应该进入这个逻辑')
	}

	// 重置
	root.finishedWork = null
	root.finishedLane = NoLane
	markRootFinished(root, lane)

	// 判断是否存在3个子阶段需要执行的操作
	// root.flags 和 root.subtreeFlags 的按位与运算
	const subtreeHasEffects =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags

	if (subtreeHasEffects || rootHasEffect) {
		// beforeMutation

		// mutation
		commitMutationEffects(finishedWork)
		root.current = finishedWork

		// layout
	} else {
		//
	}
}
