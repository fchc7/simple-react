/**
 * 这些都是抽象的方法和属性，具体实现由宿主环境提供
 * 当前宿主环境模拟浏览器环境
 */

import { FiberNode } from 'react-reconciler/src/fiber'
import { HostComponent, HostText } from 'react-reconciler/src/workTags'
import { DOMElement, updateFiberProps } from './SyntheticEvent'
import { Props } from 'shared/ReactTypes'

export type Container = Element
export type Instance = Element
export type TextInstance = Text
/**
 * 抽象方法，在宿主环境中，创建一个元素节点
 * @param type
 * @param props
 * @returns
 */
export const createInstance = (type: string, props: Props): Instance => {
	// TODO 需要处理 props
	const element = document.createElement(type)
	updateFiberProps(element as unknown as DOMElement, props)
	return element
}

/**
 * 抽象方法，在宿主环境中，将子节点插入到父节点
 * @param parent
 * @param child
 */
export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance,
) => {
	parent.appendChild(child)
}

/**
 * 抽象方法，在宿主环境中，创建一个文本节点
 * @param content
 * @returns
 */
export const createTextInstance = (content: string) => {
	return document.createTextNode(content)
}

/**
 * 抽象方法，在宿主环境中，将子节点插入到父节点
 * @param child
 * @param parent
 */
export const appendChildToContainer = appendInitialChild

export const commitUpdate = (fiber: FiberNode) => {
	switch (fiber.tag) {
		case HostText: {
			const text = fiber.memoizedProps.content
			commitTextUpdate(fiber.stateNode as TextInstance, text)
			break
		}
		case HostComponent: {
			break
		}
		default:
			if (__DEV__) {
				console.warn('未实现的 commitUpdate 类型', fiber)
			}
	}
}

export function commitTextUpdate(textInstance: TextInstance, content: string) {
	textInstance.textContent = content
}

export function removeChild(
	child: Instance | TextInstance,
	parent: Instance | Container,
) {
	parent.removeChild(child)
}

export function insertChildToContainer(
	child: Instance | TextInstance,
	parent: Instance | Container,
	before: Instance,
) {
	parent.insertBefore(child, before)
}
