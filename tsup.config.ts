// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx', 'src/react-native.tsx', 'src/vite.ts'],
  format: ['cjs', 'esm'],       // 输出两种格式
  dts: true,                   // 自动生成 .d.ts 类型文件
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  external: [
    'react',
    'react-dom',
    'react-native',
    'react-native-webview',
    'monaco-editor/esm/vs/editor/editor.worker?worker',
    'monaco-editor/esm/vs/language/json/json.worker?worker',
    'monaco-editor/esm/vs/language/css/css.worker?worker',
    'monaco-editor/esm/vs/language/html/html.worker?worker',
    'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
  ],
  loader: {
    '.css': 'css',
  },
});