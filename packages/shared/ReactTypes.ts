export type Type = any

export type Key = any

export type Ref = any

export type Props = any

export type ElementType = any

export interface ReactElement {
	$$typeof: symbol | number
	type: ElementType
	key: Key
	ref: Ref
	props: Props
	__mark: string
}

/**
 * 对应两种触发更新的方式
 * 1. setState(x => x + 1)
 * 2. setState(1)
 */
export type Action<State> = State | ((prevState: State) => State)
