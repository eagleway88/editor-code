import * as monaco from 'monaco-editor'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { CSSProperties } from 'react'

export type EditorCode = Partial<monaco.editor.IStandaloneCodeEditor>

// 给`react native`调用的方法
// export type RNMethodCalledName =
//   `editor.${keyof monaco.editor.IStandaloneCodeEditor}`

export interface EditorCodeProps {
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

export const EditorCode = forwardRef<EditorCode, EditorCodeProps>(
  (props, ref) => {
    const devRef = useRef<HTMLDivElement>(null)
    const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
    const onMountRef = useRef(props.onMount)
    const onChangeRef = useRef(props.onChange)
    const { style, className, options, override } = props

    onMountRef.current = props.onMount
    onChangeRef.current = props.onChange

    useImperativeHandle(ref, () => editor.current ?? {})

    useEffect(() => {
      if (!devRef.current || editor.current) {
        return
      }

      const instance = monaco.editor.create(devRef.current, options, override)
      const changeSubscription = instance.onDidChangeModelContent(() => {
        onChangeRef.current?.(instance.getValue(), instance)
      })

      editor.current = instance
      onMountRef.current?.(instance)

      return () => {
        changeSubscription.dispose()
        instance.dispose()
        editor.current = null
      }
    }, [])

    useEffect(() => {
      if (!editor.current || !options) {
        return
      }

      editor.current.updateOptions(options)
    }, [options])

    return <div style={style} className={className} ref={devRef} />
  }
)
