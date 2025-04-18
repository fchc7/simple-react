import { ReactElement } from 'shared/ReactTypes'
import { Container } from 'hostConfig'
import {
	createContainer,
	updateContainer,
} from 'react-reconciler/src/fiberReconciler'
import { initEvent } from './SyntheticEvent'

// ReactDOM.createRoot(container).render(<App />)

export function createRoot(container: Container) {
	const root = createContainer(container)

	return {
		render: (element: ReactElement) => {
			initEvent(container, 'click')
			updateContainer(element, root)
		},
	}
}
