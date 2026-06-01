import { interpret } from './interpreter'
import { parsePseudocode } from './parser'
import { addFriendlyHelp } from './errorHelp'
import type { RunResult } from './types'

export function runPseudocode(code: string, inputText = ''): RunResult {
  const parsed = parsePseudocode(code)

  const result = interpret(parsed.statements, inputText, parsed.errors)
  return {
    ...result,
    errors: addFriendlyHelp(result.errors),
  }
}
