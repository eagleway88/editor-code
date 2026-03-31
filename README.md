# @eagleway/editor-code

基于 Monaco Editor 的代码编辑组件库，提供两种接入方式：

- React：直接渲染 DOM 版 EditorCode
- React Native：通过 WebView 加载内联的 standalone HTML

## 安装

```bash
npm install @eagleway/editor-code
```

React Native 额外需要：

```bash
npm install react-native-webview
```

## React 用法

```tsx
import { useRef } from 'react'
import { EditorCode } from '@eagleway/editor-code'

export function Demo() {
  const editorRef = useRef(null)

  return (
    <EditorCode
      ref={editorRef}
      style={{ height: 400 }}
      options={{
        value: 'const answer = 42',
        language: 'typescript',
        automaticLayout: true,
        minimap: { enabled: false }
      }}
    />
  )
}
```

## React Native 用法

推荐直接使用包内导出的 HTML source，而不是自己管理静态文件路径。

```tsx
import { useRef } from 'react'
import { EditorCodeNative } from '@eagleway/editor-code/react-native'
import { createEditorCodeHtmlSource } from '@eagleway/editor-code/react-native/html'

export function Demo() {
  const editorRef = useRef(null)

  return (
    <EditorCodeNative
      ref={editorRef}
      source={createEditorCodeHtmlSource()}
      containerStyle={{ flex: 1 }}
      webViewStyle={{ flex: 1 }}
      editorProps={{
        options: {
          value: 'export const platform = "native"',
          language: 'typescript',
          automaticLayout: true,
          minimap: { enabled: false }
        }
      }}
      onChange={(value) => {
        console.log('editor value:', value)
      }}
      onReady={(editor) => {
        editor.setTheme('vs-dark')
      }}
    />
  )
}
```

## React Native 可调用 API

```tsx
const value = await editorRef.current?.getValue()
editorRef.current?.setValue('const nextValue = true')
editorRef.current?.setLanguage('json')
editorRef.current?.setTheme('vs-dark')
editorRef.current?.updateOptions({ readOnly: true })
editorRef.current?.focus()
editorRef.current?.layout()
```

## 受控同步

如果你希望外部状态驱动编辑器内容、语言或主题，可以直接传这些属性：

```tsx
<EditorCodeNative
  source={createEditorCodeHtmlSource()}
  value={code}
  language={language}
  theme={theme}
  onChange={setCode}
/>
```

## 设计说明

- React 版本直接创建 Monaco editor
- React Native 版本通过 react-native-webview 承载 standalone HTML
- RN 与 WebView 之间通过 window.__EDITOR_CODE_BRIDGE__ 双向通信
- standalone HTML 已在构建后导出为包内字符串，方便直接作为 WebView source 使用

## 构建

```bash
npm run build
```

该命令会执行：

- tsup：生成 React 和 React Native 入口
- webpack：生成 standalone HTML
- node 脚本：把 standalone HTML 转成 @eagleway/editor-code/react-native/html 子入口