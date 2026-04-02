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
  const bootstrapAttemptRef = useRef(0)
  const bootstrapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRenderedEditorPropsRef = useRef<string>('')
  const latestEditorValueRef = useRef(value)
  const pendingValueRequestsRef = useRef(
    new Map<string, (value: string) => void>()
  )

  const webViewOnLoadStart = webViewProps?.onLoadStart as
    | (() => void)
    | undefined
  const webViewOnLoadEnd = webViewProps?.onLoadEnd as
    | (() => void)
    | undefined
  const webViewInjectedJavaScript = webViewProps?.injectedJavaScript as
    | string
    | undefined

  function createInitialBootstrapScript(nextProps?: EditorRenderPayload) {
    const payload = JSON.stringify(nextProps ?? editorProps ?? {})
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')

    return `
      (function() {
        var props = JSON.parse('${payload}');
        var attempts = 0;
        var maxAttempts = 40;
        var postError = function(message) {
          if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) {
            return;
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: '[bootstrap-injected] ' + message
          }));
        };
        var run = function() {
          attempts += 1;
          try {
            if (typeof window.renderEditorCode === 'function') {
              window.renderEditorCode(props);
              return;
            }
            if (
              window.__EDITOR_CODE_BRIDGE__ &&
              typeof window.__EDITOR_CODE_BRIDGE__.receive === 'function'
            ) {
              window.__EDITOR_CODE_BRIDGE__.receive(JSON.stringify({
                type: 'render',
                props: props
              }));
              return;
            }
          } catch (error) {
            postError(error && error.message ? error.message : String(error));
            return;
          }
          if (attempts < maxAttempts) {
            setTimeout(run, 250);
            return;
          }
          postError(
            'render bridge not ready' +
              ' templateReady=' +
              String(!!window.__EDITOR_CODE_TEMPLATE_READY__) +
              ' runtimeReady=' +
              String(!!window.__EDITOR_CODE_RUNTIME_READY__) +
              ' hasRenderEditorCode=' +
              String(typeof window.renderEditorCode === 'function') +
              ' hasBridge=' +
              String(
                !!window.__EDITOR_CODE_BRIDGE__ &&
                  typeof window.__EDITOR_CODE_BRIDGE__.receive === 'function'
              )
          );
        };
        run();
      })();
      true;
    `
  }

  const mergedInjectedJavaScript = [
    webViewInjectedJavaScript,
    createInitialBootstrapScript(editorProps)
  ]
    .filter(Boolean)
    .join('\n')

  function clearBootstrapTimer() {
    if (bootstrapTimerRef.current) {
      clearTimeout(bootstrapTimerRef.current)
      bootstrapTimerRef.current = null
    }
  }

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

  function bootstrapRender(nextProps?: EditorRenderPayload) {
    clearBootstrapTimer()
    bootstrapAttemptRef.current += 1
    renderEditor(nextProps)

    if (bridgeReady || bootstrapAttemptRef.current >= 40) {
      return
    }

    bootstrapTimerRef.current = setTimeout(() => {
      bootstrapRender(nextProps)
    }, 250)
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
    return () => {
      clearBootstrapTimer()
    }
  }, [])

  useEffect(() => {
    if (!bridgeReady) {
      return
    }

    const serializedEditorProps = JSON.stringify(editorProps ?? {})
    if (lastRenderedEditorPropsRef.current === serializedEditorProps) {
      return
    }

    lastRenderedEditorPropsRef.current = serializedEditorProps
    renderEditor(editorProps)
  }, [bridgeReady, editorProps])

  useEffect(() => {
    if (!bridgeReady || value === undefined) {
      return
    }

    if (latestEditorValueRef.current === value) {
      return
    }

    latestEditorValueRef.current = value
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
      clearBootstrapTimer()
      bootstrapAttemptRef.current = 0
      setBridgeReady(true)
      lastRenderedEditorPropsRef.current = ''
      latestEditorValueRef.current = value
      onReady?.(editorRefApi)
      renderEditor(editorProps)
      return
    }

    if (message.type === 'change') {
      latestEditorValueRef.current = message.value
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
        injectedJavaScript={mergedInjectedJavaScript}
        onLoadStart={() => {
          bootstrapAttemptRef.current = 0
          clearBootstrapTimer()
          webViewOnLoadStart?.()
        }}
        onLoadEnd={() => {
          webViewOnLoadEnd?.()
          bootstrapRender(editorProps)
        }}
        onMessage={handleMessage as never}
        style={webViewStyle as never}
      />
    </View>
  )
})