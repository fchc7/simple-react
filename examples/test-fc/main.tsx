import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
	const [count, setCount] = useState(100)
	const arr =
		count % 2 === 0
			? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
			: [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]
	return (
		<div>
			<ul onClickCapture={() => setCount(count + 1)}>{arr}</ul>
		</div>
	)
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
