const fs = require('fs')
const path = require('path')

const workspaceRoot = path.resolve(__dirname, '..')
const distPath = path.join(workspaceRoot, 'dist')
const staticPath = path.join(distPath, 'static')
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

const assetMimeTypes = {
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
}

let html = fs.readFileSync(htmlPath, 'utf8')
if (fs.existsSync(staticPath)) {
  const staticFiles = fs
    .readdirSync(staticPath)
    .filter((fileName) => fileName !== 'standalone.html')

  for (const fileName of staticFiles) {
    const extname = path.extname(fileName).toLowerCase()
    const mimeType = assetMimeTypes[extname]
    const assetPath = path.join(staticPath, fileName)

    if (!mimeType || !fs.existsSync(assetPath)) {
      continue
    }

    const assetBase64 = fs.readFileSync(assetPath).toString('base64')
    const dataUri = `data:${mimeType};base64,${assetBase64}`
    html = html.split(fileName).join(dataUri)
    fs.rmSync(assetPath, { force: true })
  }

  fs.writeFileSync(htmlPath, html)
}

const serializedHtml = JSON.stringify(html)

const cjsSource = `const reactNative = require('./react-native.js');\n\nconst editorCodeHtml = ${serializedHtml};\n\nfunction createEditorCodeHtmlSource() {\n  return { html: editorCodeHtml };\n}\n\nexports.EditorCodeNative = reactNative.EditorCodeNative;\nexports.editorCodeHtml = editorCodeHtml;\nexports.createEditorCodeHtmlSource = createEditorCodeHtmlSource;\n`

const esmSource = `export { EditorCodeNative } from './react-native.mjs';\n\nexport const editorCodeHtml = ${serializedHtml};\n\nexport function createEditorCodeHtmlSource() {\n  return { html: editorCodeHtml };\n}\n`

const typesSource = `export { EditorCodeNative } from './react-native';\nexport { type EditorCodeNativeProps, type EditorCodeNativeRef } from './react-native';\nexport declare const editorCodeHtml: string;\nexport declare function createEditorCodeHtmlSource(): {\n  html: string;\n};\n`

fs.writeFileSync(path.join(distPath, 'react-native-entry.js'), cjsSource)
fs.writeFileSync(path.join(distPath, 'react-native-entry.mjs'), esmSource)
fs.writeFileSync(path.join(distPath, 'react-native-entry.d.ts'), typesSource)

for (const fileName of ['react-native-html.js', 'react-native-html.mjs', 'react-native-html.d.ts']) {
  const filePath = path.join(distPath, fileName)
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true })
  }
}
