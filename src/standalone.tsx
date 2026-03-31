import * as monaco from 'monaco-editor'
import { createRef, render } from 'preact'
import type { EditorCode as EditorCodeHandle, EditorCodeProps } from './index'
import { EditorCode } from './index'
import {
  type EditorBridgeInboundMessage,
  type EditorBridgeOutboundMessage,
  type EditorValueResponseMessage
} from './bridge'

type StandaloneWindow = Window & {
  ReactNativeWebView?: {
    postMessage: (message: string) => void
  }
  renderEditorCode?: (props: EditorCodeProps) => boolean
  __EDITOR_CODE_BRIDGE__?: {
    receive: (rawMessage: string) => boolean
  }
}

const standaloneWindow = window as StandaloneWindow
const editorRef = createRef<EditorCodeHandle>()
let currentProps: EditorCodeProps = {}

function postToNative(message: EditorBridgeOutboundMessage) {
  standaloneWindow.ReactNativeWebView?.postMessage(JSON.stringify(message))
}

function postValue(requestId: string, value: string) {
  const response: EditorValueResponseMessage = {
    type: 'value',
    requestId,
    value
  }

  postToNative(response)
}

function mountEditor(props: EditorCodeProps) {
  currentProps = props

  const root = document.getElementById('root')
  if (!root) {
    return false
  }

  render(
    <EditorCode
      {...props}
      ref={editorRef}
      onMount={(editor) => {
        props.onMount?.(editor)
        postToNative({ type: 'ready' })
      }}
      onChange={(value, editor) => {
        props.onChange?.(value, editor)
        postToNative({ type: 'change', value })
      }}
    />,
    root
  )

  return true
}

function handleBridgeMessage(message: EditorBridgeInboundMessage) {
  const editor = editorRef.current

  switch (message.type) {
    case 'render':
      return mountEditor({ ...currentProps, ...message.props })
    case 'updateOptions':
      editor?.updateOptions?.(message.options)
      return true
    case 'setValue':
      editor?.setValue?.(message.value)
      return true
    case 'setLanguage': {
      const model = editor?.getModel?.()
      if (!model) {
        return false
      }

      monaco.editor.setModelLanguage(model, message.language)
      return true
    }
    case 'setTheme':
      monaco.editor.setTheme(message.theme)
      return true
    case 'getValue':
      postValue(message.requestId, editor?.getValue?.() ?? '')
      return true
    case 'focus':
      editor?.focus?.()
      return true
    case 'layout':
      editor?.layout?.()
      return true
    default:
      return false
  }
}

standaloneWindow.renderEditorCode = (props: EditorCodeProps) => mountEditor(props)
standaloneWindow.__EDITOR_CODE_BRIDGE__ = {
  receive(rawMessage: string) {
    try {
      const message = JSON.parse(rawMessage) as EditorBridgeInboundMessage
      return handleBridgeMessage(message)
    } catch (error) {
      postToNative({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to parse bridge message'
      })
      return false
    }
  }
}
