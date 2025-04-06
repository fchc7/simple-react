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
 * 判断 commit 阶段的 mutation 子阶段是否需要执行副作用
 */
export const MutationMask = Placement | Update | ChildDeletion
