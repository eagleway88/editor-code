// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx', 'src/react-native.tsx'],
  format: ['cjs', 'esm'],       // 输出两种格式
  dts: true,                   // 自动生成 .d.ts 类型文件
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  external: ['react', 'react-dom', 'react-native', 'react-native-webview'],
  loader: {
    '.css': 'css',
  },
});