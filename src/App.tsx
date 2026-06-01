import { type ChangeEvent, useState } from 'react'
import { runPseudocode } from './engine/runPseudocode'
import {
  galleryExamples,
  type GalleryExample,
  type GalleryExampleLevel,
} from './examples/galleryExamples'
import type { RunResult } from './engine/types'

const defaultCode = `# Friendly syntax example

declare score : integer
declare i : integer
score = 85

if score >= 80
    output "High pass"
end if

for i ← 1 to 3
    output "Attempt ", i
next

OUTPUT "URL example: http://example.com"`

const defaultInput = ''

type Mode = 'igcse' | 'alevel'
type GalleryFilter = 'ALL' | Extract<GalleryExampleLevel, 'IGCSE' | 'A_LEVEL'>
type MessageTone = 'success' | 'error'
type UiMessage = {
  text: string
  tone: MessageTone
}
type RunResultWithTrace = RunResult & {
  trace?: string[]
}

const supportedCodeFileExtensions = ['.txt', '.pseudo', '.pseudocode']

function App() {
  const [mode, setMode] = useState<Mode>('igcse')
  const [code, setCode] = useState(defaultCode)
  const [standardInput, setStandardInput] = useState(defaultInput)
  const [output, setOutput] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [variables, setVariables] = useState('')
  const [files, setFiles] = useState('')
  const [trace, setTrace] = useState<string[]>([])
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('ALL')
  const [uiMessage, setUiMessage] = useState<UiMessage | null>(null)

  const visibleExamples = galleryExamples.filter((example) => {
    return (
      galleryFilter === 'ALL' ||
      example.level === 'BOTH' ||
      example.level === galleryFilter
    )
  })

  function handleRun() {
    const result: RunResultWithTrace = runPseudocode(code, standardInput)

    setOutput(result.output.join('\n'))
    setErrors(result.errors)
    setVariables(formatVariables(result.variables))
    setFiles(formatFiles(result.files))
    setTrace(Array.isArray(result.trace) ? result.trace : [])
    setUiMessage(null)
  }

  function handleLoadExample(example: GalleryExample) {
    setCode(example.code)
    setStandardInput(example.input ?? '')
    clearRunPanels()
    showMessage(`Loaded example: ${example.title}`)

    if (example.level === 'A_LEVEL') {
      setMode('alevel')
    } else if (example.level === 'IGCSE') {
      setMode('igcse')
    }
  }

  async function handleUploadCodeFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (!file) {
      return
    }

    if (!isSupportedCodeFile(file.name)) {
      showMessage(
        'Unsupported file type. Please upload a .txt, .pseudo, or .pseudocode file.',
        'error',
      )
      return
    }

    try {
      const fileText = await file.text()
      setCode(fileText)
      clearRunPanels()
      showMessage(`Loaded file: ${file.name}`)
    } catch {
      showMessage('Could not read file as plain text.', 'error')
    }
  }

  function handleDownloadCode() {
    downloadTextFile('pseudocode.txt', code)
    showMessage('Code downloaded.')
  }

  async function handleCopyCode() {
    await copyToClipboard(code, 'Code copied to clipboard.')
  }

  async function handleCopyOutput() {
    if (!output) {
      showMessage('No output to copy.')
      return
    }

    await copyToClipboard(output, 'Output copied to clipboard.')
  }

  async function handleCopyErrors() {
    if (errors.length === 0) {
      showMessage('No errors to copy.')
      return
    }

    await copyToClipboard(errors.join('\n'), 'Errors copied to clipboard.')
  }

  async function handleCopyTrace() {
    if (trace.length === 0) {
      showMessage('No trace to copy.')
      return
    }

    await copyToClipboard(trace.join('\n'), 'Trace copied to clipboard.')
  }

  function handleDownloadReport() {
    downloadTextFile(
      'pseudocode-run-report.txt',
      buildRunReport({
        code,
        standardInput,
        output,
        errors,
        variables,
        files,
        trace,
      }),
    )
    showMessage('Report downloaded.')
  }

  function clearRunPanels() {
    setOutput('')
    setErrors([])
    setVariables('')
    setFiles('')
    setTrace([])
  }

  function showMessage(text: string, tone: MessageTone = 'success') {
    setUiMessage({ text, tone })
  }

  async function copyToClipboard(text: string, successMessage: string) {
    if (!navigator.clipboard?.writeText) {
      showMessage('Clipboard is not available in this browser.', 'error')
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      showMessage(successMessage)
    } catch {
      showMessage('Clipboard is not available in this browser.', 'error')
    }
  }

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <div>
          <h1 id="page-title">Cambridge Pseudocode Runner</h1>
          <p>Run, test, and debug Cambridge-style pseudocode directly in the browser.</p>
          <p className="product-note">
            This is an independent teaching tool and is not an official Cambridge International product.
          </p>
        </div>

        <div className="mode-switch" aria-label="Pseudocode syllabus mode">
          <button
            type="button"
            className={mode === 'igcse' ? 'active' : ''}
            aria-pressed={mode === 'igcse'}
            onClick={() => setMode('igcse')}
          >
            IGCSE 0478
          </button>
          <button
            type="button"
            className={mode === 'alevel' ? 'active' : ''}
            aria-pressed={mode === 'alevel'}
            onClick={() => setMode('alevel')}
          >
            A Level 9618
          </button>
        </div>
      </section>

      <section className="gallery-panel" aria-labelledby="gallery-heading">
        <div className="gallery-header">
          <div>
            <h2 id="gallery-heading">Example Gallery</h2>
            <p>Load a common Cambridge pseudocode example into the editor.</p>
          </div>

          <div className="gallery-filters" aria-label="Filter examples by level">
            <button
              type="button"
              className={galleryFilter === 'ALL' ? 'active' : ''}
              aria-pressed={galleryFilter === 'ALL'}
              onClick={() => setGalleryFilter('ALL')}
            >
              All
            </button>
            <button
              type="button"
              className={galleryFilter === 'IGCSE' ? 'active' : ''}
              aria-pressed={galleryFilter === 'IGCSE'}
              onClick={() => setGalleryFilter('IGCSE')}
            >
              IGCSE
            </button>
            <button
              type="button"
              className={galleryFilter === 'A_LEVEL' ? 'active' : ''}
              aria-pressed={galleryFilter === 'A_LEVEL'}
              onClick={() => setGalleryFilter('A_LEVEL')}
            >
              A Level
            </button>
          </div>
        </div>

        {uiMessage && (
          <p className={`ui-message ${uiMessage.tone === 'error' ? 'error' : ''}`}>
            {uiMessage.text}
          </p>
        )}

        <div className="example-grid">
          {visibleExamples.map((example) => (
            <ExampleCard example={example} key={example.id} onLoad={handleLoadExample} />
          ))}
        </div>
      </section>

      <section className="workspace" aria-label="Runner workspace">
        <div className="editor-column">
          <div className="editor-toolbar">
            <label className="field-label" htmlFor="code-input">
              Code
            </label>
            <div className="toolbar-actions">
              <label className="secondary-button" htmlFor="code-file-input">
                Upload Code File
              </label>
              <input
                id="code-file-input"
                className="visually-hidden"
                type="file"
                accept=".txt,.pseudo,.pseudocode,text/plain"
                onChange={handleUploadCodeFile}
              />
              <button type="button" className="secondary-button" onClick={handleDownloadCode}>
                Download Code
              </button>
              <button type="button" className="secondary-button" onClick={handleCopyCode}>
                Copy Code
              </button>
            </div>
          </div>
          <textarea
            id="code-input"
            className="code-editor"
            spellCheck="false"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>

        <aside className="side-column">
          <label className="field-label" htmlFor="standard-input">
            Standard Input
          </label>
          <textarea
            id="standard-input"
            className="standard-input"
            spellCheck="false"
            value={standardInput}
            onChange={(event) => setStandardInput(event.target.value)}
          />

          <button type="button" className="run-button" onClick={handleRun}>
            Run
          </button>
          <button type="button" className="secondary-button report-button" onClick={handleDownloadReport}>
            Download Report
          </button>

          <section className="panel" aria-labelledby="output-heading">
            <div className="panel-header">
              <h2 id="output-heading">Output</h2>
              <button type="button" className="panel-action" onClick={handleCopyOutput}>
                Copy Output
              </button>
            </div>
            <pre>{output || 'No output yet. Click Run to execute your pseudocode.'}</pre>
          </section>

          <section className="panel error-panel" aria-labelledby="error-heading">
            <div className="panel-header">
              <h2 id="error-heading">Error</h2>
              <button type="button" className="panel-action" onClick={handleCopyErrors}>
                Copy Errors
              </button>
            </div>
            <ErrorList errors={errors} />
          </section>

          <section className="panel" aria-labelledby="variables-heading">
            <div className="panel-header">
              <h2 id="variables-heading">Variables</h2>
            </div>
            <pre>{variables || 'No variables yet.'}</pre>
          </section>

          <section className="panel" aria-labelledby="files-heading">
            <div className="panel-header">
              <h2 id="files-heading">Files</h2>
            </div>
            <pre>{files || 'No virtual files created.'}</pre>
          </section>

          <section className="panel" aria-labelledby="trace-heading">
            <div className="panel-header">
              <h2 id="trace-heading">Execution Trace</h2>
              <button type="button" className="panel-action" onClick={handleCopyTrace}>
                Copy Trace
              </button>
            </div>
            <pre>{trace.length > 0 ? trace.join('\n') : 'No trace yet.'}</pre>
          </section>
        </aside>
      </section>

      <section className="help-section" aria-labelledby="help-heading">
        <div className="help-column">
          <h2 id="help-heading">How to use</h2>
          <ol>
            <li>Paste pseudocode or load an example.</li>
            <li>Enter standard input if the code uses INPUT.</li>
            <li>Click Run.</li>
            <li>Check Output, Errors, Variables, Virtual Files, and Execution Trace.</li>
          </ol>
        </div>

        <div className="help-column">
          <h2>Supported Syntax</h2>
          <div className="syntax-grid">
            <div>
              <h3>Supported core features</h3>
              <ul>
                <li>DECLARE</li>
                <li>INPUT / OUTPUT</li>
                <li>IF / ELSE / ENDIF</li>
                <li>CASE / OTHERWISE / ENDCASE</li>
                <li>FOR / NEXT</li>
                <li>WHILE / ENDWHILE</li>
                <li>REPEAT / UNTIL</li>
                <li>ARRAY</li>
                <li>STRING / INTEGER / REAL / BOOLEAN / CHAR</li>
              </ul>
            </div>

            <div>
              <h3>Supported advanced features</h3>
              <ul>
                <li>PROCEDURE / CALL</li>
                <li>BYVALUE / BYREF</li>
                <li>FUNCTION / RETURN</li>
                <li>TYPE / RECORD</li>
                <li>virtual file handling</li>
                <li>built-in functions</li>
                <li>comments</li>
                <li>execution trace</li>
              </ul>
            </div>
          </div>
          <p className="help-note">
            File handling is simulated in browser memory only. It does not read or write real local files.
          </p>
        </div>
      </section>

    </main>
  )
}

function isSupportedCodeFile(fileName: string): boolean {
  const normalizedName = fileName.toLowerCase()
  return supportedCodeFileExtensions.some((extension) => normalizedName.endsWith(extension))
}

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function buildRunReport({
  code,
  standardInput,
  output,
  errors,
  variables,
  files,
  trace,
}: {
  code: string
  standardInput: string
  output: string
  errors: string[]
  variables: string
  files: string
  trace: string[]
}): string {
  return [
    'Cambridge Pseudocode Runner Report',
    '',
    '=== Code ===',
    code || '(empty)',
    '',
    '=== Standard Input ===',
    standardInput || '(empty)',
    '',
    '=== Output ===',
    output || 'No output.',
    '',
    '=== Errors ===',
    errors.length > 0 ? errors.join('\n') : 'No errors.',
    '',
    '=== Variables ===',
    variables || 'No variables.',
    '',
    '=== Virtual Files ===',
    files || 'No virtual files created.',
    '',
    '=== Execution Trace ===',
    trace.length > 0 ? trace.join('\n') : 'No trace.',
  ].join('\n')
}

function ExampleCard({
  example,
  onLoad,
}: {
  example: GalleryExample
  onLoad: (example: GalleryExample) => void
}) {
  return (
    <article className="example-card">
      <div className="example-card-header">
        <h3>{example.title}</h3>
        <span className="level-badge">{formatLevel(example.level)}</span>
      </div>
      <p className="example-meta">{example.category}</p>
      <p className="example-description">{example.description}</p>
      {example.expectedOutput && (
        <pre className="expected-output">{example.expectedOutput.join('\n')}</pre>
      )}
      <button type="button" className="load-example-button" onClick={() => onLoad(example)}>
        Load
      </button>
    </article>
  )
}

function formatLevel(level: GalleryExampleLevel): string {
  if (level === 'A_LEVEL') {
    return 'A Level'
  }

  if (level === 'IGCSE') {
    return 'IGCSE'
  }

  return 'Both'
}

function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return <pre>No errors.</pre>
  }

  return (
    <div className="error-list">
      {errors.map((error, index) => {
        const details = parseFriendlyError(error)

        return (
          <article className="error-card" key={`${details.main}-${index}`}>
            <strong>{details.main}</strong>
            {details.reason && <p>{details.reason}</p>}
            {details.suggestion && <p>{details.suggestion}</p>}
          </article>
        )
      })}
    </div>
  )
}

function parseFriendlyError(error: string): { main: string; reason?: string; suggestion?: string } {
  const lines = error.split('\n')
  const reason = lines.find((line) => line.startsWith('Possible reason:'))
  const suggestion = lines.find((line) => line.startsWith('Suggestion:'))

  return {
    main: lines[0] ?? error,
    reason,
    suggestion,
  }
}

function formatVariables(variables: Record<string, unknown>): string {
  const entries = Object.entries(variables)

  if (entries.length === 0) {
    return ''
  }

  return entries.map(([name, value]) => `${name} = ${formatVariableValue(value)}`).join('\n')
}

function formatVariableValue(value: unknown): string {
  if (isPlainObject(value)) {
    return Object.entries(value)
      .map(([index, item]) => `[${index}] = ${formatVariableValue(item)}`)
      .join('\n')
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }

  if (typeof value === 'string') {
    return `"${value}"`
  }

  return String(value)
}

function formatFiles(files: Record<string, string[]>): string {
  const entries = Object.entries(files)

  if (entries.length === 0) {
    return ''
  }

  return entries
    .map(([name, lines]) => `${name}:\n${lines.length > 0 ? lines.join('\n') : '(empty)'}`)
    .join('\n\n')
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export default App
