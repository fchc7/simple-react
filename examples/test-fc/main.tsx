import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

function App() {
	const [count, setCount] = useState(0)
	useEffect(() => {
		console.log('App mount')
	}, [])

	useEffect(() => {
		console.log('App update', count)
		return () => {
			console.log('App destroy', count)
		}
	}, [count])
	return (
		<div onClick={() => setCount(count + 1)}>
			{count === 0 ? <Child /> : 'noop'}
		</div>
	)
}

function Child() {
	useEffect(() => {
		console.log('Child mount')
		return () => {
			console.log('Child unmount')
		}
	}, [])
	return <div>child</div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
