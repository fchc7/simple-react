let syncQueue: ((...args: any[]) => void)[] | null = null // 同步任务队列
let isFlushingSyncQueue = false // 是否正在执行同步任务队列

/**
 * 调度同步任务, 将任务添加到同步任务队列中
 * @param callback
 */
export function scheduleSyncCallback(callback: (...args: any[]) => void) {
	if (syncQueue === null) {
		syncQueue = [callback]
	} else {
		syncQueue.push(callback)
	}
}

/**
 * 执行同步任务, 执行同步任务队列中的所有任务
 */
export function flushSyncCallbacks() {
	if (!isFlushingSyncQueue && syncQueue !== null) {
		isFlushingSyncQueue = true
		try {
			syncQueue.forEach((callback) => callback())
		} catch (error) {
			if (__DEV__) {
				console.error('flushSyncCallbacks 执行失败', error)
			}
		} finally {
			isFlushingSyncQueue = false
			syncQueue = null
		}
	}
}
