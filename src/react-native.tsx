import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { View } from 'react-native'
import WebView from 'react-native-webview'
import type { EditorCodeProps } from './index'
import {
  createBridgeScript,
  type EditorBridgeOutboundMessage,
  type EditorRenderPayload,
  type EditorValueResponseMessage
} from './bridge'

type WebViewRef = {
  injectJavaScript: (script: string) => void
}

type NativeMessageEvent = {
  nativeEvent: {
    data: string
  }
}

export interface EditorCodeNativeRef {
  focus: () => void
  layout: () => void
  getValue: () => Promise<string>
  setValue: (value: string) => void
  setLanguage: (language: string) => void
  setTheme: (theme: string) => void
  updateOptions: (options: NonNullable<EditorCodeProps['options']>) => void
}

export interface EditorCodeNativeProps {
  source: unknown
  containerStyle?: unknown
  webViewStyle?: unknown
  webViewProps?: Record<string, unknown>
  editorProps?: EditorRenderPayload
  value?: string
  language?: string
  theme?: string
  onReady?: (ref: EditorCodeNativeRef) => void
  onChange?: (value: string) => void
  onError?: (message: string) => void
}

export const EditorCodeNative = forwardRef<
  EditorCodeNativeRef,
  EditorCodeNativeProps
>((props, ref) => {
  const {
    source,
    containerStyle,
    webViewStyle,
    webViewProps,
    editorProps,
    value,
    language,
    theme,
    onReady,
    onChange,
    onError
  } = props
  const webViewRef = useRef<WebViewRef | null>(null)
  const [bridgeReady, setBridgeReady] = useState(false)
  const requestIdRef = useRef(0)
  const pendingValueRequestsRef = useRef(
    new Map<string, (value: string) => void>()
  )

  function sendMessage(script: string) {
    webViewRef.current?.injectJavaScript(script)
  }

  function sendBridgeMessage(message: Parameters<typeof createBridgeScript>[0]) {
    sendMessage(createBridgeScript(message))
  }

  function renderEditor(nextProps?: EditorRenderPayload) {
    sendBridgeMessage({
      type: 'render',
      props: nextProps ?? editorProps ?? {}
    })
  }

  const editorRefApi: EditorCodeNativeRef = {
    focus() {
      sendBridgeMessage({ type: 'focus' })
    },
    layout() {
      sendBridgeMessage({ type: 'layout' })
    },
    getValue() {
      const requestId = `value-${requestIdRef.current}`
      requestIdRef.current += 1

      return new Promise<string>((resolve) => {
        pendingValueRequestsRef.current.set(requestId, resolve)
        sendBridgeMessage({ type: 'getValue', requestId })
      })
    },
    setValue(value: string) {
      sendBridgeMessage({ type: 'setValue', value })
    },
    setLanguage(language: string) {
      sendBridgeMessage({ type: 'setLanguage', language })
    },
    setTheme(theme: string) {
      sendBridgeMessage({ type: 'setTheme', theme })
    },
    updateOptions(options: NonNullable<EditorCodeProps['options']>) {
      sendBridgeMessage({ type: 'updateOptions', options })
    }
  }

  useImperativeHandle(ref, () => editorRefApi)

  useEffect(() => {
    if (!bridgeReady) {
      return
    }

    renderEditor(editorProps)
  }, [bridgeReady, editorProps])

  useEffect(() => {
    if (!bridgeReady || value === undefined) {
      return
    }

    editorRefApi.setValue(value)
  }, [bridgeReady, value])

  useEffect(() => {
    if (!bridgeReady || !language) {
      return
    }

    editorRefApi.setLanguage(language)
  }, [bridgeReady, language])

  useEffect(() => {
    if (!bridgeReady || !theme) {
      return
    }

    editorRefApi.setTheme(theme)
  }, [bridgeReady, theme])

  function handleMessage(event: NativeMessageEvent) {
    let message: EditorBridgeOutboundMessage

    try {
      message = JSON.parse(event.nativeEvent.data) as EditorBridgeOutboundMessage
    } catch {
      return
    }

    if (message.type === 'ready') {
      setBridgeReady(true)
      onReady?.(editorRefApi)
      renderEditor(editorProps)
      return
    }

    if (message.type === 'change') {
      onChange?.(message.value)
      return
    }

    if (message.type === 'error') {
      onError?.(message.message)
      return
    }

    if (message.type === 'value') {
      const resolver = pendingValueRequestsRef.current.get(message.requestId)
      if (!resolver) {
        return
      }

      pendingValueRequestsRef.current.delete(message.requestId)
      resolver((message as EditorValueResponseMessage).value)
    }
  }

  return (
    <View style={containerStyle}>
      <WebView
        {...webViewProps}
        ref={webViewRef as never}
        source={source as never}
        originWhitelist={['*']}
        javaScriptEnabled
        onLoadEnd={() => renderEditor(editorProps)}
        onMessage={handleMessage as never}
        style={webViewStyle as never}
      />
    </View>
  )
})