import type { Token } from './types'

type TokenizeResult = {
  tokens: Token[]
  errors: string[]
}

const wordOperators = new Set(['DIV', 'MOD', 'AND', 'OR', 'NOT'])

export function tokenizeExpression(source: string, line: number): TokenizeResult {
  const tokens: Token[] = []
  const errors: string[] = []
  let index = 0

  while (index < source.length) {
    const char = source[index]

    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (char === '"') {
      const start = index
      index += 1
      let value = ''

      while (index < source.length && source[index] !== '"') {
        value += source[index]
        index += 1
      }

      if (index >= source.length) {
        errors.push(`Line ${line}: Unterminated string literal.`)
        break
      }

      index += 1
      tokens.push({ type: 'string', lexeme: source.slice(start, index), value, line })
      continue
    }

    if (/[0-9]/.test(char)) {
      const start = index

      while (index < source.length && /[0-9]/.test(source[index])) {
        index += 1
      }

      if (source[index] === '.') {
        index += 1

        if (!/[0-9]/.test(source[index] ?? '')) {
          errors.push(`Line ${line}: Invalid number literal.`)
          break
        }

        while (index < source.length && /[0-9]/.test(source[index])) {
          index += 1
        }
      }

      const lexeme = source.slice(start, index)
      tokens.push({ type: 'number', lexeme, value: Number(lexeme), line })
      continue
    }

    if (/[A-Za-z_]/.test(char)) {
      const start = index

      while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) {
        index += 1
      }

      const lexeme = source.slice(start, index)
      const upper = lexeme.toUpperCase()

      if (upper === 'TRUE' || upper === 'FALSE') {
        tokens.push({ type: 'boolean', lexeme, value: upper === 'TRUE', line })
      } else if (wordOperators.has(upper)) {
        tokens.push({ type: 'operator', lexeme: upper, line })
      } else {
        tokens.push({ type: 'identifier', lexeme, line })
      }

      continue
    }

    if (char === '(') {
      tokens.push({ type: 'leftParen', lexeme: char, line })
      index += 1
      continue
    }

    if (char === ')') {
      tokens.push({ type: 'rightParen', lexeme: char, line })
      index += 1
      continue
    }

    if (char === '[') {
      tokens.push({ type: 'leftBracket', lexeme: char, line })
      index += 1
      continue
    }

    if (char === ']') {
      tokens.push({ type: 'rightBracket', lexeme: char, line })
      index += 1
      continue
    }

    if (char === ',') {
      tokens.push({ type: 'comma', lexeme: char, line })
      index += 1
      continue
    }

    const twoCharacterOperator = source.slice(index, index + 2)
    if (twoCharacterOperator === '<=' || twoCharacterOperator === '>=' || twoCharacterOperator === '<>') {
      tokens.push({ type: 'operator', lexeme: twoCharacterOperator, line })
      index += 2
      continue
    }

    if (char === '+' || char === '-' || char === '*' || char === '/' || char === '=' || char === '<' || char === '>') {
      tokens.push({ type: 'operator', lexeme: char, line })
      index += 1
      continue
    }

    errors.push(`Line ${line}: Unexpected character '${char}'.`)
    index += 1
  }

  tokens.push({ type: 'eof', lexeme: '', line })

  return { tokens, errors }
}
