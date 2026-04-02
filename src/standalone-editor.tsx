import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution'
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/basic-languages/scss/scss.contribution'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { CSSProperties } from 'react'

const jsonLanguageId = 'json'

monaco.languages.register({ id: jsonLanguageId })
monaco.languages.setLanguageConfiguration(jsonLanguageId, {
  brackets: [
    ['{', '}'],
    ['[', ']']
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '"', close: '"', notIn: ['string'] }
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '"', close: '"' }
  ]
})
monaco.languages.setMonarchTokensProvider(jsonLanguageId, {
  defaultToken: '',
  tokenPostfix: '.json',
  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.square' }
  ],
  tokenizer: {
    root: [
      [/\{/, { token: 'delimiter.curly', next: '@object' }],
      [/\[/, { token: 'delimiter.square', next: '@array' }],
      { include: '@value' }
    ],
    object: [
      [/\}/, { token: 'delimiter.curly', next: '@pop' }],
      [/"([^"\\]|\\.)*"(?=\s*:)/, 'key'],
      [/:/, 'delimiter'],
      [/,/, 'delimiter'],
      { include: '@value' },
      [/\s+/, 'white']
    ],
    array: [
      [/\]/, { token: 'delimiter.square', next: '@pop' }],
      [/\{/, { token: 'delimiter.curly', next: '@object' }],
      [/\[/, { token: 'delimiter.square', next: '@array' }],
      [/,/, 'delimiter'],
      { include: '@value' },
      [/\s+/, 'white']
    ],
    value: [
      [/"([^"\\]|\\.)*"/, 'string'],
      [/-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?/, 'number'],
      [/true|false/, 'keyword'],
      [/null/, 'keyword.null'],
      [/\s+/, 'white']
    ]
  }
})

export type StandaloneEditorCode = Partial<monaco.editor.IStandaloneCodeEditor>

export interface StandaloneEditorCodeProps {
  options?: monaco.editor.IStandaloneEditorConstructionOptions
  override?: monaco.editor.IEditorOverrideServices
  className?: string
  style?: CSSProperties
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void
  onChange?: (
    value: string,
    editor: monaco.editor.IStandaloneCodeEditor
  ) => void
}

export const StandaloneEditorCode = forwardRef<
  StandaloneEditorCode,
  StandaloneEditorCodeProps
>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const onMountRef = useRef(props.onMount)
  const onChangeRef = useRef(props.onChange)
  const { style, className, options, override } = props

  onMountRef.current = props.onMount
  onChangeRef.current = props.onChange

  useImperativeHandle(ref, () => editorRef.current ?? {})

  useEffect(() => {
    if (!containerRef.current || editorRef.current) {
      return
    }

    const instance = monaco.editor.create(containerRef.current, options, override)
    const changeSubscription = instance.onDidChangeModelContent(() => {
      onChangeRef.current?.(instance.getValue(), instance)
    })

    editorRef.current = instance
    onMountRef.current?.(instance)

    return () => {
      changeSubscription.dispose()
      instance.dispose()
      editorRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!editorRef.current || !options) {
      return
    }

    editorRef.current.updateOptions(options)
  }, [options])

  return <div style={style} className={className} ref={containerRef} />
})