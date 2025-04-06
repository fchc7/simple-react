import { ReactElement } from 'shared/ReactTypes'
import { FiberNode, FiberRootNode } from './fiber'
import { Container } from 'hostConfig'
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	UpdateQueue,
} from './updateQueue'
import { HostRoot } from './workTags'
import { scheduleUpdateOnFiber } from './workLoop'
import { requestUpdateLane } from './fiberLanes'

/**
 * 创建顶层的根节点 FiberRootNode；
 * 此方法提供给宿主环境使用，对应到浏览器下的就是 ReactDOM.createRoot(rootElement)
 * @param container
 * @returns
 */
export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null)
	const root = new FiberRootNode(container, hostRootFiber)
	hostRootFiber.updateQueue = createUpdateQueue()
	return root
}

/**
 * 首次渲染，即从根节点开始调度更新；
 * 此方法提供给宿主环境使用，对应到浏览器下的就是 ReactDOM.createRoot(rootElement).render(<App />) 中的 render 方法
 * @param element
 * @param root
 */
export function updateContainer(element: ReactElement, root: FiberRootNode) {
	const hostRootFiber = root.current
	const lane = requestUpdateLane()
	const update = createUpdate<ReactElement>(element, lane)
	enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<ReactElement>, update)
	scheduleUpdateOnFiber(hostRootFiber, lane)
	return element
}
