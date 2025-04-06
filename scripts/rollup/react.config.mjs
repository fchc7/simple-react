import { getBaseRollupPlugins, getPkgPath } from './utils.mjs'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import { name, module } from '../../packages/react/package.json'

// React 包的输入输出配置
const reactPkgPath = getPkgPath(name)
const reactDistPath = getPkgPath(name, true)

export default [
	// React
	{
		input: `${reactPkgPath}/${module}`,
		output: {
			file: `${reactDistPath}/index.js`,
			name: 'React',
			format: 'umd',
		},

		plugins: [
			...getBaseRollupPlugins({ alias: { __DEV__: true } }),
			generatePackageJson({
				inputFolder: reactPkgPath,
				outputFolder: reactDistPath,
				baseContents: ({ name, description, version }) => ({
					name,
					description,
					version,
					main: 'index.js',
				}),
			}),
		],
	},

	// jsx-runtime
	{
		input: `${reactPkgPath}/src/jsx.ts`,
		output: [
			{
				file: `${reactDistPath}/jsx-runtime.js`,
				name: 'jsx-runtime',
				format: 'umd',
			},
			{
				file: `${reactDistPath}/jsx-dev-runtime.js`,
				name: 'jsx-dev-runtime',
				format: 'umd',
			},
		],
		plugins: [...getBaseRollupPlugins()],
	},
]
