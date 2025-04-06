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
			<ul
				onClick={() => {
					setCount((count) => {
						console.log('count', count)
						return count + 1
					})
					setCount((count) => {
						console.log('count', count)
						return count + 1
					})
					setCount((count) => count + 1)
				}}
			>
				<li>{count}</li>
				<li>8</li>
				{arr}
			</ul>
		</div>
	)
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
