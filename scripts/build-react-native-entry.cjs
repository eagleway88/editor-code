const fs = require('fs')
const path = require('path')

const workspaceRoot = path.resolve(__dirname, '..')
const distPath = path.join(workspaceRoot, 'dist')
const htmlPath = path.join(distPath, 'static', 'standalone.html')
const wrapperPaths = [
  path.join(distPath, 'react-native-entry.js'),
  path.join(distPath, 'react-native-entry.mjs'),
  path.join(distPath, 'react-native-entry.d.ts')
]

if (!fs.existsSync(htmlPath)) {
  const hasWrapper = wrapperPaths.every((filePath) => fs.existsSync(filePath))
  if (hasWrapper) {
    process.exit(0)
  }

  throw new Error(`Missing standalone HTML build artifact: ${htmlPath}`)
}

const html = fs.readFileSync(htmlPath, 'utf8')
const serializedHtml = JSON.stringify(html)

const cjsSource = `const reactNative = require('./react-native.js');\n\nconst editorCodeHtml = ${serializedHtml};\n\nfunction createEditorCodeHtmlSource() {\n  return { html: editorCodeHtml };\n}\n\nexports.EditorCodeNative = reactNative.EditorCodeNative;\nexports.editorCodeHtml = editorCodeHtml;\nexports.createEditorCodeHtmlSource = createEditorCodeHtmlSource;\n`

const esmSource = `export { EditorCodeNative } from './react-native.mjs';\n\nexport const editorCodeHtml = ${serializedHtml};\n\nexport function createEditorCodeHtmlSource() {\n  return { html: editorCodeHtml };\n}\n`

const typesSource = `export { EditorCodeNative } from './react-native';\nexport { type EditorCodeNativeProps, type EditorCodeNativeRef } from './react-native';\nexport declare const editorCodeHtml: string;\nexport declare function createEditorCodeHtmlSource(): {\n  html: string;\n};\n`

fs.writeFileSync(path.join(distPath, 'react-native-entry.js'), cjsSource)
fs.writeFileSync(path.join(distPath, 'react-native-entry.mjs'), esmSource)
fs.writeFileSync(path.join(distPath, 'react-native-entry.d.ts'), typesSource)

for (const fileName of [
  'react-native-html.js',
  'react-native-html.mjs',
  'react-native-html.d.ts'
]) {
  const filePath = path.join(distPath, fileName)
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true })
  }
}

const staticPath = path.join(distPath, 'static')
if (fs.existsSync(staticPath)) {
  fs.rmSync(staticPath, { recursive: true, force: true })
}
