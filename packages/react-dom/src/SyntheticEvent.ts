import { Container } from 'hostConfig'
import { Props } from 'shared/ReactTypes'

export const elementPropsKey = '__reactProps'

const validEventTypeList = ['click']

export interface DOMElement extends Element {
	[elementPropsKey]: Props
}

type EventCallback = (e: Event) => void

interface Paths {
	capture: EventCallback[]
	bubble: EventCallback[]
}

interface SyntheticEvent extends Event {
	__stopPropagation: boolean
}

/**
 * 更新fiber对应的宿主（比如 DOM ）的	props，这一步与宿主环境相关，所以放在具体的实现中
 * @param node
 * @param props
 */
export function updateFiberProps(node: DOMElement, props: Props) {
	node[elementPropsKey] = props
}

export function initEvent(container: Container, eventType: string) {
	if (!validEventTypeList.includes(eventType)) {
		console.warn('当前不支持', eventType, '事件')
		return
	}

	if (__DEV__) {
		console.log('初始化事件', eventType)
	}

	container.addEventListener(eventType, (e) => {
		dispatchEvent(container, eventType, e)
	})
}

/**
 * 合成事件触发后的事件分发
 * 1. 收集沿途的事件
 * 2. 构造合成事件
 * 3. 遍历capture捕获事件
 * 4. 遍历bubble冒泡事件
 * @param container
 * @param eventType
 * @param e
 * @returns
 */
function dispatchEvent(container: Container, eventType: string, e: Event) {
	const targetElement = e.target as DOMElement
	if (targetElement === null) {
		console.warn('事件不存在target', e)
		return
	}
	// 1. 收集沿途的事件
	const { capture, bubble } = collectPaths(targetElement, container, eventType)
	// 2. 构造合成事件
	const se = createSyntheticEvent(e)
	// 3. 遍历capture捕获事件
	triggerEventFlow(capture, se)
	// 4. 遍历bubble冒泡事件
	if (!se.__stopPropagation) {
		triggerEventFlow(bubble, se)
	}
}

/**
 * 从当前的targetElement出发，收集沿途的捕获事件和冒泡事件
 * @param targetElement
 * @param container
 * @param eventType
 * @returns
 */
function collectPaths(
	targetElement: DOMElement,
	container: Container,
	eventType: string,
): Paths {
	const paths: Paths = {
		capture: [],
		bubble: [],
	}

	while (targetElement && targetElement !== container) {
		// 收集
		const elementProps = targetElement[elementPropsKey]
		if (elementProps) {
			const callbackNameList = getEventCallbackNameFromEventType(eventType)
			if (callbackNameList) {
				callbackNameList.forEach((callbackName, index) => {
					const eventCallback = elementProps[callbackName]
					if (eventCallback) {
						// 将捕获事件和冒泡事件分别收集到capture和bubble中
						if (index === 0) {
							paths.capture.unshift(eventCallback) // 反向收集，因为事件是从上到下传播的
						} else {
							paths.bubble.push(eventCallback)
						}
					}
				})
			}
		}
		targetElement = targetElement.parentElement as unknown as DOMElement
	}

	return paths
}

/**
 * 根据事件类型获取事件回调名称，原生事件名 -> [捕获事件名, 冒泡事件名]
 * 'click' -> ['onClickCapture', 'onClick']
 * @param eventType
 * @returns
 */
function getEventCallbackNameFromEventType(
	eventType: string,
): string[] | undefined {
	return {
		click: ['onClickCapture', 'onClick'],
	}[eventType]
}

/**
 * 创建合成事件
 * @param e
 * @returns
 */
function createSyntheticEvent(e: Event) {
	const syntheticEvent: SyntheticEvent = e as SyntheticEvent
	syntheticEvent.__stopPropagation = false
	const originalPreventDefault = e.stopPropagation
	syntheticEvent.stopPropagation = () => {
		syntheticEvent.__stopPropagation = true
		if (originalPreventDefault) {
			originalPreventDefault()
		}
	}
	return syntheticEvent
}

function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
	for (let i = 0; i < paths.length; i++) {
		const callback = paths[i]
		callback.call(null, se)
		// 如果合成事件被阻止，则停止传播
		if (se.__stopPropagation) {
			break
		}
	}
}
