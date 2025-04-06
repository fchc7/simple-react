import { getBaseRollupPlugins, getPkgPath } from './utils.mjs'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'
import {
	name,
	module,
	peerDependencies,
} from '../../packages/react-dom/package.json'

// React 包的输入输出配置
const pkgPath = getPkgPath(name)
const distPath = getPkgPath(name, true)

export default [
	// React-dom
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${distPath}/index.js`,
				name: 'ReactDOM',
				format: 'umd',
			},
			// 兼容 v18 的 react-dom/client 导入
			{
				file: `${distPath}/client.js`,
				name: 'client',
				format: 'umd',
			},
		],
		// 不要将 react 相关的代码打包到 react-dom 中
		external: [...Object.keys(peerDependencies)],
		plugins: [
			...getBaseRollupPlugins(),
			//
			alias({
				entries: {
					hostConfig: `${pkgPath}/src/hostConfig.ts`,
				},
			}),
			generatePackageJson({
				inputFolder: pkgPath,
				outputFolder: distPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					peerDependencies: {
						react: version,
					},
					main: 'index.js',
				}),
			}),
		],
	},

	{
		input: `${pkgPath}/test-utils.ts`,
		output: [
			{
				file: `${distPath}/test-utils.js`,
				name: 'testUtils',
				format: 'umd',
			},
		],
		// 不要将 react 相关的代码打包到 react-dom 中
		external: ['react-dom', 'react'],
		plugins: getBaseRollupPlugins(),
	},
]
