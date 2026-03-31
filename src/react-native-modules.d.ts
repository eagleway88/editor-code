declare module 'react-native' {
  import type * as React from 'react'

  export const View: React.ComponentType<{
    style?: unknown
    children?: React.ReactNode
  }>
}

declare module 'react-native-webview' {
  import type * as React from 'react'

  export interface WebViewProps {
    source?: unknown
    originWhitelist?: string[]
    javaScriptEnabled?: boolean
    onLoadEnd?: () => void
    onMessage?: (event: { nativeEvent: { data: string } }) => void
    style?: unknown
    [key: string]: unknown
  }

  type WebViewHandle = {
    injectJavaScript: (script: string) => void
  }

  const WebView: React.ForwardRefExoticComponent<
    WebViewProps & React.RefAttributes<WebViewHandle>
  >

  export default WebView
}