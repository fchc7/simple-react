import reactDomConfig from './react-dom.config.mjs'
import reactConfig from './react.config.mjs'

export default () => {
	return [...reactConfig, ...reactDomConfig]
}
