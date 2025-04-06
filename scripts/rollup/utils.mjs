import { resolve } from 'path'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { babel } from '@rollup/plugin-babel'
import replace from '@rollup/plugin-replace'

export function getPkgPath(name, isDist) {
	if (isDist) {
		return resolve(__dirname, '../../dist/node_module', name)
	}
	return resolve(__dirname, '../../packages', name)
}

export function getBaseRollupPlugins(
	alias = {
		__DEV__: true,
		preventAssignment: true,
	},
	{ babel: babelConfig = {} } = {},
) {
	return [
		replace(alias),
		commonjs(),
		nodeResolve({
			extensions: ['.js', '.jsx', '.ts', '.tsx'],
		}),
		babel({
			babelHelpers: 'bundled',
			presets: ['@babel/preset-env', '@babel/preset-typescript'],
			plugins: [],
			exclude: 'node_modules/**',
			extensions: ['.js', '.jsx', '.ts', '.tsx'],
			...babelConfig,
		}),
	]
}
