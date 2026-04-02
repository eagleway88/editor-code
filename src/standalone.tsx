import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { createRef, render } from 'preact'
import type {
  StandaloneEditorCode as EditorCodeHandle,
  StandaloneEditorCodeProps as EditorCodeProps
} from './standalone-editor'
import { StandaloneEditorCode as EditorCode } from './standalone-editor'
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
let lastKnownSelection: monaco.Selection | null = null
let relayoutTimer: ReturnType<typeof setTimeout> | null = null
let disposeMountEffects: (() => void) | null = null

;(standaloneWindow as typeof standaloneWindow & {
  __EDITOR_CODE_RUNTIME_READY__?: boolean
}).__EDITOR_CODE_RUNTIME_READY__ = true

function postToNative(message: EditorBridgeOutboundMessage) {
  standaloneWindow.ReactNativeWebView?.postMessage(JSON.stringify(message))
}

postToNative({
  type: 'error',
  message: '[standalone-runtime] module executed'
})

function postValue(requestId: string, value: string) {
  const response: EditorValueResponseMessage = {
    type: 'value',
    requestId,
    value
  }

  postToNative(response)
}

function clearRelayoutTimer() {
  if (relayoutTimer) {
    clearTimeout(relayoutTimer)
    relayoutTimer = null
  }
}

function relayoutAndRestoreSelection(reason: string) {
  clearRelayoutTimer()

  relayoutTimer = setTimeout(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    try {
      editor.layout?.()

      if (lastKnownSelection) {
        editor.setSelection?.(lastKnownSelection)
        editor.setPosition?.(lastKnownSelection.getPosition())
        editor.revealPositionInCenterIfOutsideViewport?.(
          lastKnownSelection.getPosition()
        )
      }

      editor.focus?.()
    } catch (error) {
      postToNative({
        type: 'error',
        message:
          '[standalone-runtime] relayout failed (' +
          reason +
          '): ' +
          (error instanceof Error ? error.message : String(error))
      })
    }
  }, 60)
}

function bindViewportListeners(editor: EditorCodeHandle) {
  const handleViewportChange = () => relayoutAndRestoreSelection('viewport')
  const handleWindowResize = () => relayoutAndRestoreSelection('window')

  standaloneWindow.visualViewport?.addEventListener('resize', handleViewportChange)
  standaloneWindow.visualViewport?.addEventListener('scroll', handleViewportChange)
  standaloneWindow.addEventListener('resize', handleWindowResize)

  return () => {
    clearRelayoutTimer()
    standaloneWindow.visualViewport?.removeEventListener(
      'resize',
      handleViewportChange
    )
    standaloneWindow.visualViewport?.removeEventListener(
      'scroll',
      handleViewportChange
    )
    standaloneWindow.removeEventListener('resize', handleWindowResize)
  }
}

function mountEditor(props: EditorCodeProps) {
  currentProps = props
  disposeMountEffects?.()
  disposeMountEffects = null

  const root = document.getElementById('root')
  if (!root) {
    return false
  }

  render(
    <EditorCode
      {...props}
      style={{
        width: '100%',
        height: '100%',
        ...(props.style ?? {})
      }}
      ref={editorRef}
      onMount={(editor) => {
        const initialSelection = editor.getSelection?.()
        if (initialSelection) {
          lastKnownSelection = initialSelection
        }

        const selectionDisposable = editor.onDidChangeCursorSelection?.((event) => {
          lastKnownSelection = event.selection
        })

        const unbindViewportListeners = bindViewportListeners(editor)
        disposeMountEffects = () => {
          selectionDisposable?.dispose?.()
          unbindViewportListeners()
        }

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

postToNative({
  type: 'error',
  message: '[standalone-runtime] bridge assigned'
})
