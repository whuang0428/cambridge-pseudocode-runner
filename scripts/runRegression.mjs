import { Buffer } from 'node:buffer'
import { build } from 'esbuild'

const source = `
  import { runPseudocode } from './src/engine/runPseudocode.ts'
  import { regressionExamples } from './src/examples/regressionExamples.ts'

  const failures = []

  for (const example of regressionExamples) {
    const result = runPseudocode(example.code, example.input ?? '')
    const expectedOutput = example.expectedOutput
    const expectedErrorIncludes = example.expectedErrorIncludes ?? []
    const outputMatches =
      expectedOutput === undefined ||
      (result.output.length === expectedOutput.length &&
        result.output.every((line, index) => line === expectedOutput[index]))
    const errorsText = result.errors.join('\\n')
    const errorsMatch =
      expectedErrorIncludes.length === 0
        ? result.errors.length === 0
        : expectedErrorIncludes.every((expected) => errorsText.includes(expected))

    if (!outputMatches || !errorsMatch) {
      failures.push({
        id: example.id,
        title: example.title,
        expectedOutput: expectedOutput ?? '(not asserted)',
        actualOutput: result.output,
        expectedErrorIncludes,
        actualErrors: result.errors,
      })
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify(failures, null, 2))
    console.error(
      \`Regression failed: \${failures.length} of \${regressionExamples.length} examples failed.\`,
    )
    process.exitCode = 1
  } else {
    console.log(\`Regression passed: \${regressionExamples.length} examples.\`)
  }
`

const result = await build({
  stdin: {
    contents: source,
    resolveDir: process.cwd(),
    sourcefile: 'regression-entry.ts',
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
})

const bundled = result.outputFiles[0]?.text

if (!bundled) {
  throw new Error('Regression runner bundle was empty.')
}

await import(`data:text/javascript;base64,${Buffer.from(bundled).toString('base64')}`)
