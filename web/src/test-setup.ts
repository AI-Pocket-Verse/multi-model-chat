import '@testing-library/jest-dom/vitest'

// 现有用例断言的是中文文案：默认按中文浏览器运行（jsdom 默认是 en-US）。
// 测英文的用例自己改 navigator.language 或调用 setLang。
Object.defineProperty(window.navigator, 'language', { value: 'zh-CN', configurable: true })
Object.defineProperty(window.navigator, 'languages', { value: ['zh-CN', 'zh'], configurable: true })
