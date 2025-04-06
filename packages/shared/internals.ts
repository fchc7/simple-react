import * as React from 'react'

/**
 * 为了实现 react 和 react-reconciler 的解耦，
 * 在这里做一次中转，将 react 的内部数据共享层暴露给 react-reconciler 使用
 */
export const internals =
	React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED

export default internals
