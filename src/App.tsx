import { useState } from 'react'
import { runPseudocode } from './engine/runPseudocode'

const defaultCode = `DECLARE Score : INTEGER
INPUT Score

CASE OF Score
    80 TO 100 :
        OUTPUT "High pass"
    50 TO 79 :
        OUTPUT "Pass"
    0 TO 49 :
        OUTPUT "Fail"
    OTHERWISE
        OUTPUT "Invalid score"
ENDCASE

CASE OF Score
    >= 90 : OUTPUT "Grade A"
    >= 80 : OUTPUT "Grade B"
    >= 70 : OUTPUT "Grade C"
    >= 60 : OUTPUT "Grade D"
    < 60 : OUTPUT "Needs improvement"
ENDCASE`

const defaultInput = '85'

type Mode = 'igcse' | 'alevel'

function App() {
  const [mode, setMode] = useState<Mode>('igcse')
  const [code, setCode] = useState(defaultCode)
  const [standardInput, setStandardInput] = useState(defaultInput)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [variables, setVariables] = useState('')

  function handleRun() {
    const result = runPseudocode(code, standardInput)

    setOutput(result.output.join('\n'))
    setError(result.errors.join('\n'))
    setVariables(formatVariables(result.variables))
  }

  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <div>
          <h1 id="page-title">Cambridge Pseudocode Runner</h1>
          <p>Run and test Cambridge IGCSE / A Level pseudocode in the browser.</p>
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

      <section className="workspace" aria-label="Runner workspace">
        <div className="editor-column">
          <label className="field-label" htmlFor="code-input">
            Code
          </label>
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

          <section className="panel" aria-labelledby="output-heading">
            <h2 id="output-heading">Output</h2>
            <pre>{output || 'No output yet.'}</pre>
          </section>

          <section className="panel error-panel" aria-labelledby="error-heading">
            <h2 id="error-heading">Error</h2>
            <pre>{error || 'No errors.'}</pre>
          </section>

          <section className="panel" aria-labelledby="variables-heading">
            <h2 id="variables-heading">Variables</h2>
            <pre>{variables || 'No variables yet.'}</pre>
          </section>
        </aside>
      </section>

      <p className="phase-note">
        Phase 10.5 prototype. Supports enhanced CASE labels, built-in functions, arrays, loops, IF blocks, input, output, assignments, expressions, and boolean logic.
      </p>
    </main>
  )
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export default App
