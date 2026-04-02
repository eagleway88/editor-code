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

如果宿主是 Vite，需要先在应用入口引入一次 Vite 子入口，让 Monaco worker 映射提前注册：

```tsx
import '@eagleway/editor-code/vite'
```

同时需要在 Vite 配置里排除依赖预构建，否则 dev 模式下 esbuild 会直接解析 `?worker` 导入并报错：

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@eagleway/editor-code', '@eagleway/editor-code/vite']
  }
})
```

## React Native 用法

默认仍可直接使用包内导出的 HTML source。若宿主需要避免把大体积 HTML 字符串通过 RN bridge 传给 WebView，也可以直接使用包内发布的 standalone.html 静态资源。

```tsx
import { useRef } from 'react'
import {
  EditorCodeNative,
  createEditorCodeHtmlSource
} from '@eagleway/editor-code/react-native'

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

## React Native 静态资源模式

从 `0.0.4` 起，React Native 子路径额外发布了 `standalone.html`，适合直接走本地 file URI：

```tsx
import { Image, Platform } from 'react-native'
import { EditorCodeNative } from '@eagleway/editor-code/react-native'

const standaloneHtmlAsset = require(
  '@eagleway/editor-code/react-native/standalone.html'
)

const iosUri = Image.resolveAssetSource(standaloneHtmlAsset)?.uri ?? ''
const iosReadAccessUri = iosUri.replace(/[^/]+$/, '')

const androidUri =
  'file:///android_res/raw/node_modules_eagleway_editorcode_dist_static_standalone.html'

<EditorCodeNative
  source={{ uri: Platform.OS === 'android' ? androidUri : iosUri }}
  webViewProps={{
    allowFileAccess: true,
    allowingReadAccessToURL:
      Platform.OS === 'android' ? 'file:///android_res/raw/' : iosReadAccessUri,
    allowUniversalAccessFromFileURLs: Platform.OS === 'android'
  }}
/>
```

说明：

- iOS 可以直接通过 `require('@eagleway/editor-code/react-native/standalone.html')` 获取 bundle 内静态文件 URI
- Android 可直接使用 React Native raw 资源命名规则推导出的固定文件名
- 这种模式更适合大体积 standalone HTML，能避免 `source={{ html }}` 的桥接开销

## 设计说明

- React 版本直接创建 Monaco editor
- React Native 版本通过 react-native-webview 承载 standalone HTML
- RN 与 WebView 之间通过 window.__EDITOR_CODE_BRIDGE__ 双向通信
- React Native 子入口内置 createEditorCodeHtmlSource，直接返回 WebView 可用的 html source
- React Native 也支持通过 `@eagleway/editor-code/react-native/standalone.html` 以本地资源模式加载 standalone HTML
- Vite 宿主可通过 @eagleway/editor-code/vite 子入口自动注册 MonacoEnvironment.getWorker

## 构建

```bash
npm run build
```

该命令会执行：

- tsup：生成 React 和 React Native 入口
- webpack：生成 React Native 使用的中间 standalone HTML
- node 脚本：把 standalone HTML 内联进最终的 @eagleway/editor-code/react-native 子入口