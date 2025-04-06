import React from 'react'
import ReactDOM from 'react-dom'

const Jsx = (
	<div>
		<span>simple react</span>
	</div>
)
// 在控制台输出JSX内容
console.log(Jsx)

console.log(React)

console.log(ReactDOM)

ReactDOM.createRoot(document.getElementById('root')).render(Jsx)
