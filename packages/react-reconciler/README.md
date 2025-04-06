## 从 jsx 代码到 DOM 的流程

```jsx
<div id="myID" key="myKey">
	<span>hello</span>
	world
	<div class="AClass">A</div>
	<div>B</div>
</div>
```

编译器会将其转换为：

```jsx
// v17 之前，你还需要在源代码中手动导入 React
/*#__PURE__*/ React.createElement(
	'div',
	{
		id: 'myID',
		key: 'myKey',
	},
	/*#__PURE__*/ React.createElement('span', null, 'hello'),
	'world',
	/*#__PURE__*/ React.createElement(
		'div',
		{
			class: 'AClass',
		},
		'A',
	),
	/*#__PURE__*/ React.createElement('div', null, 'B'),
)

// v17 之后
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime'
/*#__PURE__*/ _jsxs(
	'div',
	{
		id: 'myID',
		children: [
			/*#__PURE__*/ _jsx('span', {
				children: 'hello',
			}),
			'world',
			/*#__PURE__*/ _jsx('div', {
				class: 'AClass',
				children: 'A',
			}),
			/*#__PURE__*/ _jsx('div', {
				children: 'B',
			}),
		],
	},
	'myKey',
)
```

React 内部实现对应的函数方法 `createElement` 和 `_jsx`，执行后转为 `ReactElement` 对象

```tsx
{
	$$typeof: Symbol.for('react.element'),
	type: 'div',
	key: 'myKey',
	ref: null,
	props: {
		id: 'myID',
		children: [
			{
				$$typeof: Symbol.for('react.element'),
				type: 'span',
				key: null,
				ref: null,
				props: { children: 'hello' },
			},
			'world',
			{
				$$typeof: Symbol.for('react.element'),
				type: 'div',
				key: null,
				ref: null,
				props: { class: 'AClass', children: 'A' },
			},
			{
				$$typeof: Symbol.for('react.element'),
				type: 'div',
				key: null,
				ref: null,
				props: { children: 'B' },
			},
		],
	},
}
```

通过 fiber reconciler 的过程，生成 fiberNode 树。

```tsx
const fiberNode = {
	type: 'div',
	props: { children: 'Hello World' },
	return: null,
	child: null,
	sibling: null,
	alternate: null,
	flags: 0,
	subtreeFlags: 0,
	updateQueue: null,
	// ...
}
```

最后根据 fiberNode 树，生成 DOM 树，并且提交至浏览器。

## 更新流程

更新流程的目的

- 生成一棵 WIP fiberNode 树
- 标记副作用 flags

更新流程的步骤，深度优先遍历 DFS

- 递：beginWork，找子节点
- 归：completeWork，找兄弟节点或者父节点

在 beginWork 中，会根据双缓冲的 current fiberNode 节点及与其之对应的 ReactElement 节点（如果有更新，那么 ReactElement 可能会有变化的），生成 WIP fiberNode 节点。在这个过程当中，会进行标记符副作用 flags 的收集，以此来指导下一步的变化。所以 Fiber 节点相比于 ReactElement 节点，不仅有静态的元素的描述信息，还记录了节点间的关系，最重要的是作为“动态的工作单元”，保存了“更新”的“上下文”。

更新的触发方式

- 用户调用 `ReactDOM.createRoot(rootElement).render(<App />)`，根节点开始走挂载流程
- 组件内部调用 setState 或者 使用 useState，从当前组件开始，但是会向上找到根节点，然后开始走更新流程
