import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import replace from '@rollup/plugin-replace'
import { getPkgPath } from '../rollup/utils.mjs'
import path from 'path'

export default defineConfig({
	plugins: [
		react(),
		replace({
			__DEV__: true,
			preventAssignment: true,
		}),
	],
	resolve: {
		alias: [
			{
				find: 'react',
				replacement: getPkgPath('react'),
			},
			{
				find: 'react-dom',
				replacement: getPkgPath('react-dom'),
			},
			{
				find: 'hostConfig',
				replacement: path.resolve(
					getPkgPath('react-dom'),
					'./src/hostConfig.ts',
				),
			},
		],
	},
})
