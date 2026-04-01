import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

type MonacoWorkerFactory = {
  new (): Worker
}

type MonacoEnvironmentLike = {
  getWorker?: (_workerId: string, label: string) => Worker
}

export interface MonacoEnvironmentInitOptions {
  force?: boolean
}

const workerMap: Record<string, MonacoWorkerFactory> = {
  json: jsonWorker,
  css: cssWorker,
  scss: cssWorker,
  less: cssWorker,
  html: htmlWorker,
  handlebars: htmlWorker,
  razor: htmlWorker,
  typescript: tsWorker,
  javascript: tsWorker
}

export function ensureMonacoEnvironment(
  options: MonacoEnvironmentInitOptions = {}
) {
  if (typeof self === 'undefined') {
    return false
  }

  const globalScope = self as typeof self & {
    MonacoEnvironment?: MonacoEnvironmentLike
  }
  const current = globalScope.MonacoEnvironment

  if (!options.force && current?.getWorker) {
    return false
  }

  globalScope.MonacoEnvironment = {
    ...current,
    getWorker(_, label) {
      const WorkerFactory = workerMap[label] ?? editorWorker
      return new WorkerFactory()
    }
  }

  return true
}

ensureMonacoEnvironment()
