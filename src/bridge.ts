import type { EditorCodeProps } from './index'

export interface EditorRenderPayload
  extends Pick<EditorCodeProps, 'className' | 'style' | 'options'> {}

export interface EditorValueResponseMessage {
  type: 'value'
  requestId: string
  value: string
}

export type EditorBridgeInboundMessage =
  | {
      type: 'render'
      props: EditorRenderPayload
    }
  | {
      type: 'updateOptions'
      options: NonNullable<EditorCodeProps['options']>
    }
  | {
      type: 'setValue'
      value: string
    }
  | {
      type: 'setLanguage'
      language: string
    }
  | {
      type: 'setTheme'
      theme: string
    }
  | {
      type: 'getValue'
      requestId: string
    }
  | {
      type: 'focus'
    }
  | {
      type: 'layout'
    }

export type EditorBridgeOutboundMessage =
  | {
      type: 'ready'
    }
  | {
      type: 'change'
      value: string
    }
  | {
      type: 'error'
      message: string
    }
  | EditorValueResponseMessage

export function createBridgeScript(message: EditorBridgeInboundMessage) {
  const serialized = JSON.stringify(message)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')

  return `window.__EDITOR_CODE_BRIDGE__?.receive('${serialized}'); true;`
}