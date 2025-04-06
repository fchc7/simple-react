import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
	return (
		<div>
			<Child />
		</div>
	)
}

const Child = () => {
	const [count, setCount] = useState(10)
	return (
		<div>
			<p onClickCapture={() => setCount(count + 1)}>{count}</p>
		</div>
	)
}
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
