import { FiberRootNode } from './fiber'

export type Lane = number
export type Lanes = number

export const NoLanes /*   */ = 0b00000000000000000000000000000000

// 数字越小，优先级越高，除了 NoLane 之外
export const NoLane /*    */ = 0b00000000000000000000000000000000
export const SyncLane /*  */ = 0b00000000000000000000000000000001

export function mergeLanes(lane1: Lane, lane2: Lane): Lanes {
	return lane1 | lane2
}

export function requestUpdateLane(): Lane {
	return SyncLane
}

/**
 * 获取最高优先级的 lane
 * @param lanes
 * @returns
 */
export function getHighestPriorityLane(lanes: Lanes): Lane {
	return lanes & -lanes
}

/**
 * 移除对应 lane 的标记
 * @param root
 * @param lane
 */
export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = root.pendingLanes & ~lane
}
