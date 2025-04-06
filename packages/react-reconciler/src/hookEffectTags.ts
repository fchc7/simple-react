/**
 * useEffect 的 tag, 标记当前的 hooks 是 useEffect ，但不一定需要触发回调
 */
export const Passive = 0b0010

/**
 * useLayoutEffect 的 tag
 */
// export const Layout = 0b0010

/**
 * useInsertionEffect 的 tag
 */
// export const Insertion = 0b0100

/**
 * 标记当前的 hook 需要执行副作用
 */
export const HooksHasEffect = 0b0001
