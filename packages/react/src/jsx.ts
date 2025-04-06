import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import type {
	ReactElement,
	Type,
	Key,
	Ref,
	Props,
	ElementType,
} from 'shared/ReactTypes'

/**
 * 创建 ReactElement，初次解析 jsx 语法得到的结构，后续会根据 ReactElement 的结构转为 Fiber 节点
 * @param type
 * @param key
 * @param ref
 * @param props
 * @returns
 */
const ReactElement = function (
	type: Type,
	key: Key,
	ref: Ref,
	props: Props,
): ReactElement {
	const element = {
		$$typeof: REACT_ELEMENT_TYPE,
		type,
		key,
		ref,
		props,
		__mark: 'sreact', // 自定义标记
	}
	return element
}

/**
 * 打包工具（比如 Babel） 会将 jsx 语法转换为 jsx 函数调用，我们需要自己实现 jsx 函数
 * @example
 * <div id="myID">hello</div>
 * =>
 * _jsx('div', { id: 'myID', children: 'hello' })
 *
 * @param type
 * @param config
 * @param maybeChildren
 * @returns ReactElement
 */
export const jsx = (type: ElementType, config: any, maybeKey: any) => {
	let key: Key = null
	const props: Props = {}
	let ref: Ref = null

	if (maybeKey !== undefined) {
		key = '' + maybeKey
	}

	Object.keys(config ?? {}).forEach((prop) => {
		const val = config[prop]
		if (prop === 'key') {
			if (val !== undefined) {
				key = '' + val
			}

			return
		}

		if (prop === 'ref') {
			if (val !== undefined) {
				ref = val
			}

			return
		}

		props[prop] = val
	})

	return ReactElement(type, key, ref, props)
}

export const jsxDEV = jsx
