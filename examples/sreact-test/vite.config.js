import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			react: path.resolve(__dirname, '../../dist/node_module/react'),
			'react-dom': path.resolve(
				__dirname,
				'../../dist/node_module/react-dom/client.js',
			),
		},
	},
	optimizeDeps: {
		include: ['react'],
	},
	// esbuild: {
	// 	jsxInject: `import React from 'react'`,
	// },
})
