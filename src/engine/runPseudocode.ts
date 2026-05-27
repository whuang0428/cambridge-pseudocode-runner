import { interpret } from './interpreter'
import { parsePseudocode } from './parser'
import type { RunResult } from './types'

export function runPseudocode(code: string): RunResult {
  const parsed = parsePseudocode(code)

  return interpret(parsed.statements, parsed.errors)
}
