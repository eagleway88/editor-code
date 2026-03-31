const fs = require('fs')
const path = require('path')

const workspaceRoot = path.resolve(__dirname, '..')
const htmlPath = path.join(workspaceRoot, 'dist', 'static', 'standalone.html')
const outputBasePath = path.join(workspaceRoot, 'dist', 'react-native-html')

if (!fs.existsSync(htmlPath)) {
  throw new Error(`Missing standalone HTML build artifact: ${htmlPath}`)
}

const html = fs.readFileSync(htmlPath, 'utf8')
const serializedHtml = JSON.stringify(html)
const moduleSource = `const editorCodeHtml = ${serializedHtml};\n\nfunction createEditorCodeHtmlSource() {\n  return { html: editorCodeHtml };\n}\n\nexports.editorCodeHtml = editorCodeHtml;\nexports.createEditorCodeHtmlSource = createEditorCodeHtmlSource;\n`
const esmSource = `export const editorCodeHtml = ${serializedHtml};\n\nexport function createEditorCodeHtmlSource() {\n  return { html: editorCodeHtml };\n}\n`
const typesSource = `export declare const editorCodeHtml: string;\nexport declare function createEditorCodeHtmlSource(): {\n  html: string;\n};\n`

fs.writeFileSync(`${outputBasePath}.js`, moduleSource)
fs.writeFileSync(`${outputBasePath}.mjs`, esmSource)
fs.writeFileSync(`${outputBasePath}.d.ts`, typesSource)