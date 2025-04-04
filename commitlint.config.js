module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'subject-case': [0, 'always'],
		'subject-empty': [2, 'never'],
		'type-empty': [2, 'never'],
		'type-enum': [
			2,
			'always',
			[
				'feat', // 新功能
				'fix', // 修复bug
				'docs', // 文档更新
				'style', // 代码格式修改，不影响代码逻辑
				'refactor', // 重构代码
				'perf', // 性能优化
				'test', // 测试相关
				'chore', // 构建过程或辅助工具的变动
				'revert', // 回滚
				'build', // 构建系统或外部依赖项的更改
				'ci', // CI配置文件和脚本的更改
			],
		],
		'header-max-length': [2, 'always', 100],
		'body-leading-blank': [2, 'always'],
		'subject-full-stop': [0, 'never'],
	},
	parserPreset: {
		parserOpts: {
			headerPattern: /^(\w+):\s([\u{1F300}-\u{1F6FF}]|[\u{2600}-\u{26FF}])\s(.+)$/u,
			headerCorrespondence: ['type', 'emoji', 'subject'],
		},
	},
}
