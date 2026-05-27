import { tokenizeExpression } from './tokenizer'
import type { BinaryOperator, Expression, ParseResult, Statement, Token, VariableType } from './types'

const declarationPattern = /^DECLARE\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(INTEGER|REAL|STRING|BOOLEAN)$/i
const inputPattern = /^INPUT\s+([A-Za-z_][A-Za-z0-9_]*)$/i
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

    const input = text.match(inputPattern)
    if (input) {
      statements.push({ kind: 'input', name: input[1], line })
      return
    }

    const output = text.match(outputPattern)
    if (output) {
      if (!output[1]?.trim()) {
        errors.push(`Line ${line}: Invalid OUTPUT statement.`)
        return
      }

      const expressions = splitOutputItems(output[1], line, errors)
        .map((item) => parseExpression(item, line, errors))
        .filter((expression): expression is Expression => expression !== null)

      if (expressions.length > 0) {
        statements.push({ kind: 'output', expressions, line })
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

function splitOutputItems(source: string, line: number, errors: string[]): string[] {
  const items: string[] = []
  let current = ''
  let depth = 0
  let inString = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (char === '"') {
      inString = !inString
      current += char
      continue
    }

    if (!inString && char === '(') {
      depth += 1
    }

    if (!inString && char === ')') {
      depth -= 1
    }

    if (!inString && depth === 0 && char === ',') {
      if (!current.trim()) {
        errors.push(`Line ${line}: Invalid OUTPUT statement.`)
      } else {
        items.push(current.trim())
      }
      current = ''
      continue
    }

    current += char
  }

  if (inString || depth !== 0) {
    items.push(source.trim())
    return items
  }

  if (!current.trim()) {
    errors.push(`Line ${line}: Invalid OUTPUT statement.`)
  } else {
    items.push(current.trim())
  }

  return items
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
    const expression = this.parseOr()

    if (!this.isAtEnd()) {
      this.error(this.peek(), 'Invalid expression.')
    }

    return expression
  }

  private parseOr(): Expression {
    let expression = this.parseAnd()

    while (this.matchOperator('OR')) {
      expression = this.binaryExpression(expression)
    }

    return expression
  }

  private parseAnd(): Expression {
    let expression = this.parseComparison()

    while (this.matchOperator('AND')) {
      expression = this.binaryExpression(expression)
    }

    return expression
  }

  private parseComparison(): Expression {
    let expression = this.parseAddition()

    while (
      this.matchOperator('=') ||
      this.matchOperator('<>') ||
      this.matchOperator('<') ||
      this.matchOperator('<=') ||
      this.matchOperator('>') ||
      this.matchOperator('>=')
    ) {
      expression = this.binaryExpression(expression)
    }

    return expression
  }

  private parseAddition(): Expression {
    let expression = this.parseMultiplication()

    while (this.matchOperator('+') || this.matchOperator('-')) {
      expression = this.binaryExpression(expression)
    }

    return expression
  }

  private parseMultiplication(): Expression {
    let expression = this.parseUnary()

    while (
      this.matchOperator('*') ||
      this.matchOperator('/') ||
      this.matchOperator('DIV') ||
      this.matchOperator('MOD')
    ) {
      expression = this.binaryExpression(expression)
    }

    return expression
  }

  private parseUnary(): Expression {
    if (this.matchOperator('NOT')) {
      const operator = this.previous()
      return {
        kind: 'unary',
        operator: 'NOT',
        expression: this.parseUnary(),
        line: operator.line,
      }
    }

    return this.parsePrimary()
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
      const expression = this.parseOr()

      if (!this.match('rightParen')) {
        this.error(opening, 'Invalid expression.')
      }

      return expression
    }

    const token = this.peek()
    this.error(token, 'Invalid expression.')
    if (!this.isAtEnd()) {
      this.advance()
    }
    return { kind: 'literal', value: 0, line: token.line }
  }

  private binaryExpression(left: Expression): Expression {
    const operator = this.previous()
    const right = this.parsePrecedenceAfter(operator.lexeme)

    return {
      kind: 'binary',
      operator: operator.lexeme as BinaryOperator,
      left,
      right,
      line: operator.line,
    }
  }

  private parsePrecedenceAfter(operator: string): Expression {
    if (operator === 'OR') {
      return this.parseAnd()
    }

    if (operator === 'AND') {
      return this.parseComparison()
    }

    if (operator === '=' || operator === '<>' || operator === '<' || operator === '<=' || operator === '>' || operator === '>=') {
      return this.parseAddition()
    }

    if (operator === '+' || operator === '-') {
      return this.parseMultiplication()
    }

    return this.parseUnary()
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
