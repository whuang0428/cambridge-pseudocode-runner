import { useState } from 'react'

const defaultCode = `DECLARE Number : INTEGER
Number ← 5
OUTPUT Number`

type Mode = 'igcse' | 'alevel'

function App() {
  const [mode, setMode] = useState<Mode>('igcse')
  const [code, setCode] = useState(defaultCode)
  const [standardInput, setStandardInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  function handleRun() {
    setError('')
    setOutput(
      'Interpreter engine is not implemented yet. This Phase 0 build only tests the UI and deployment setup.',
    )
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
        </aside>
      </section>

      <p className="phase-note">Phase 0 prototype. Interpreter engine not implemented yet.</p>
    </main>
  )
}

export default App
