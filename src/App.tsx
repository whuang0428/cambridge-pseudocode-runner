import { useState } from 'react'
import { runPseudocode } from './engine/runPseudocode'

const defaultCode = `DECLARE A : INTEGER
DECLARE B : INTEGER
DECLARE Total : INTEGER
INPUT A
INPUT B
Total ← A + B
OUTPUT "The total is ", Total
OUTPUT "A is greater than B: ", A > B
OUTPUT "A DIV B = ", A DIV B
OUTPUT "A MOD B = ", A MOD B`

const defaultInput = `17
5`

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
        Phase 2 prototype. Supports INPUT, OUTPUT, assignments, expressions, comparisons, and boolean logic.
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
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }

  if (typeof value === 'string') {
    return `"${value}"`
  }

  return String(value)
}

export default App
