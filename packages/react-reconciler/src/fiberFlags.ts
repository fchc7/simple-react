export type Flags = number

// 副作用 flags
/**
 * 无副作用
 */
export const NoFlags = 0b0000000
/**
 * 插入或者移动
 */
export const Placement = 0b0000001

/**
 * 更新
 */
export const Update = 0b0000010
/**
 * 删除子级
 */
export const ChildDeletion = 0b0000100

/**
 * 标记当前fiber本次更新中需要触发 useEffect 回调，
 * 即某个 hook 需要是 Passive ｜ HookHasEffect
 */
export const PassiveEffect = 0b00001000

/**
 * 判断 commit 阶段的 mutation 子阶段是否需要执行副作用
 */
export const MutationMask = Placement | Update | ChildDeletion

/**
 * 判断 commit 阶段是否需要执行 useEffect
 * ChildDeletion 表示卸载，需要执行 useEffect 的销毁函数
 */
export const PassiveMask = PassiveEffect | ChildDeletion
