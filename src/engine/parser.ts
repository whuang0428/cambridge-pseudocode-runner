import { tokenizeExpression } from './tokenizer'
import type { Expression, ParseResult, Statement, Token, VariableType } from './types'

const declarationPattern = /^DECLARE\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(INTEGER|REAL|STRING|BOOLEAN)$/i
const outputPattern = /^OUTPUT(?:\s+(.+))?$/i
const assignmentPattern = /^([A-Za-z_][A-Za-z0-9_]*)\s*(?:←|<-)\s*(.+)$/

export function parsePseudocode(code: string): ParseResult {
  const statements: Statement[] = []
  const errors: string[] = []
  const lines = code.replace(/\r\n/g, '\n').split('\n')

  lines.forEach((rawLine, index) => {
    const line = index + 1
    const text = rawLine.trim()

    if (!text) {
      return
    }

    const declaration = text.match(declarationPattern)
    if (declaration) {
      statements.push({
        kind: 'declare',
        name: declaration[1],
        variableType: declaration[2].toUpperCase() as VariableType,
        line,
      })
      return
    }

    const output = text.match(outputPattern)
    if (output) {
      if (!output[1]?.trim()) {
        errors.push(`Line ${line}: Invalid OUTPUT statement.`)
        return
      }

      const expression = parseExpression(output[1], line, errors)
      if (expression) {
        statements.push({ kind: 'output', expression, line })
      }
      return
    }

    const assignment = text.match(assignmentPattern)
    if (assignment) {
      const expression = parseExpression(assignment[2], line, errors)
      if (expression) {
        statements.push({ kind: 'assign', name: assignment[1], expression, line })
      }
      return
    }

    errors.push(`Line ${line}: Syntax error.`)
  })

  return { statements, errors }
}

function parseExpression(source: string, line: number, errors: string[]): Expression | null {
  const tokenized = tokenizeExpression(source, line)
  errors.push(...tokenized.errors)

  if (tokenized.errors.length > 0) {
    return null
  }

  const parser = new ExpressionParser(tokenized.tokens)
  const expression = parser.parse()
  errors.push(...parser.errors)

  return parser.errors.length > 0 ? null : expression
}

class ExpressionParser {
  public readonly errors: string[] = []
  private current = 0

  constructor(private readonly tokens: Token[]) {}

  parse(): Expression {
    const expression = this.parseAddition()

    if (!this.isAtEnd()) {
      this.error(this.peek(), 'Unexpected token in expression.')
    }

    return expression
  }

  private parseAddition(): Expression {
    let expression = this.parseMultiplication()

    while (this.matchOperator('+') || this.matchOperator('-')) {
      const operator = this.previous()
      const right = this.parseMultiplication()
      expression = {
        kind: 'binary',
        operator: operator.lexeme as '+' | '-',
        left: expression,
        right,
        line: operator.line,
      }
    }

    return expression
  }

  private parseMultiplication(): Expression {
    let expression = this.parsePrimary()

    while (this.matchOperator('*') || this.matchOperator('/')) {
      const operator = this.previous()
      const right = this.parsePrimary()
      expression = {
        kind: 'binary',
        operator: operator.lexeme as '*' | '/',
        left: expression,
        right,
        line: operator.line,
      }
    }

    return expression
  }

  private parsePrimary(): Expression {
    if (this.match('number') || this.match('string') || this.match('boolean')) {
      const token = this.previous()
      return { kind: 'literal', value: token.value!, line: token.line }
    }

    if (this.match('identifier')) {
      const token = this.previous()
      return { kind: 'variable', name: token.lexeme, line: token.line }
    }

    if (this.match('leftParen')) {
      const opening = this.previous()
      const expression = this.parseAddition()

      if (!this.match('rightParen')) {
        this.error(opening, 'Expected closing parenthesis.')
      }

      return expression
    }

    const token = this.peek()
    this.error(token, 'Expected expression.')
    if (!this.isAtEnd()) {
      this.advance()
    }
    return { kind: 'literal', value: 0, line: token.line }
  }

  private match(type: Token['type']): boolean {
    if (this.check(type)) {
      this.advance()
      return true
    }

    return false
  }

  private matchOperator(operator: string): boolean {
    if (this.peek().type === 'operator' && this.peek().lexeme === operator) {
      this.advance()
      return true
    }

    return false
  }

  private check(type: Token['type']): boolean {
    return this.peek().type === type
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current += 1
    }

    return this.previous()
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'eof'
  }

  private peek(): Token {
    return this.tokens[this.current]
  }

  private previous(): Token {
    return this.tokens[this.current - 1]
  }

  private error(token: Token, message: string): void {
    this.errors.push(`Line ${token.line}: ${message}`)
  }
}
