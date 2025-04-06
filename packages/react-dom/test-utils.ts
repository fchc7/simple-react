import { ReactElement } from 'shared/ReactTypes'
import { createRoot } from 'react-dom/src/root'

export function renderIntoContainer(element: ReactElement) {
	const div = document.createElement('div')
	createRoot(div).render(element)
}
