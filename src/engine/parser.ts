import { tokenizeExpression } from './tokenizer'
import type { AssignmentTarget, BinaryOperator, Expression, ParseResult, Statement, Token, VariableType } from './types'

type SourceLine = {
  line: number
  text: string
}

type StopToken = 'ELSE' | 'ENDIF' | 'NEXT' | 'ENDWHILE' | 'UNTIL' | 'EOF'

const scalarDeclarationPattern = /^DECLARE\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(INTEGER|REAL|STRING|BOOLEAN)$/i
const arrayDeclarationPattern = /^DECLARE\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*ARRAY\s*\[(.+):(.+)]\s+OF\s+([A-Za-z_][A-Za-z0-9_]*)$/i
const inputPattern = /^INPUT\s+(.+)$/i
const outputPattern = /^OUTPUT(?:\s+(.+))?$/i
const assignmentPattern = /^(.+?)\s*(?:←|<-)\s*(.+)$/
const ifPattern = /^IF\s+(.+)\s+THEN$/i
const nextPattern = /^NEXT\s+([A-Za-z_][A-Za-z0-9_]*)$/i
const forPattern = /^FOR\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:←|<-)\s+(.+)$/i
const whilePattern = /^WHILE\s+(.+)$/i
const untilPattern = /^UNTIL\s+(.+)$/i
const supportedTypes = new Set(['INTEGER', 'REAL', 'STRING', 'BOOLEAN'])

export function parsePseudocode(code: string): ParseResult {
  const errors: string[] = []
  const lines = code
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((rawLine, index) => ({ line: index + 1, text: rawLine.trim() }))
    .filter((sourceLine) => sourceLine.text.length > 0)

  const parser = new StatementParser(lines, errors)
  const statements = parser.parseProgram()

  return { statements, errors }
}

class StatementParser {
  private current = 0

  constructor(
    private readonly lines: SourceLine[],
    private readonly errors: string[],
  ) {}

  parseProgram(): Statement[] {
    const statements = this.parseBlock([])

    while (!this.isAtEnd()) {
      const sourceLine = this.peek()
      const upper = sourceLine.text.toUpperCase()

      if (upper === 'ELSE') {
        this.errors.push(`Line ${sourceLine.line}: ELSE without matching IF.`)
      } else if (upper === 'ENDIF') {
        this.errors.push(`Line ${sourceLine.line}: ENDIF without matching IF.`)
      } else if (upper === 'ENDWHILE') {
        this.errors.push(`Line ${sourceLine.line}: ENDWHILE without matching WHILE.`)
      } else if (/^UNTIL\b/i.test(sourceLine.text)) {
        this.errors.push(`Line ${sourceLine.line}: UNTIL without matching REPEAT.`)
      } else if (/^NEXT\b/i.test(sourceLine.text)) {
        this.errors.push(`Line ${sourceLine.line}: NEXT without matching FOR.`)
      } else {
        this.errors.push(`Line ${sourceLine.line}: Syntax error.`)
      }

      this.current += 1
    }

    return statements
  }

  private parseBlock(stopTokens: StopToken[]): Statement[] {
    const statements: Statement[] = []

    while (!this.isAtEnd()) {
      const sourceLine = this.peek()
      const upper = sourceLine.text.toUpperCase()

      if (
        upper === 'ELSE' ||
        upper === 'ENDIF' ||
        upper === 'ENDWHILE' ||
        /^NEXT\b/i.test(sourceLine.text) ||
        /^UNTIL\b/i.test(sourceLine.text)
      ) {
        if (upper === 'ELSE' && stopTokens.includes('ELSE')) return statements
        if (upper === 'ENDIF' && stopTokens.includes('ENDIF')) return statements
        if (upper === 'ENDWHILE' && stopTokens.includes('ENDWHILE')) return statements
        if (/^NEXT\b/i.test(sourceLine.text) && stopTokens.includes('NEXT')) return statements
        if (/^UNTIL\b/i.test(sourceLine.text) && stopTokens.includes('UNTIL')) return statements

        return statements
      }

      const statement = this.parseStatement()
      if (statement) {
        statements.push(statement)
      }
    }

    return statements
  }

  private parseStatement(): Statement | null {
    const sourceLine = this.peek()
    const { line, text } = sourceLine

    const scalarDeclaration = text.match(scalarDeclarationPattern)
    if (scalarDeclaration) {
      this.current += 1
      return {
        kind: 'declare',
        name: scalarDeclaration[1],
        variableType: scalarDeclaration[2].toUpperCase() as VariableType,
        line,
      }
    }

    const arrayDeclaration = text.match(arrayDeclarationPattern)
    if (arrayDeclaration) {
      this.current += 1
      return parseArrayDeclaration(arrayDeclaration, line, this.errors)
    }

    if (/^DECLARE\b/i.test(text) && /\bARRAY\b/i.test(text)) {
      this.current += 1
      this.errors.push(`Line ${line}: Invalid ARRAY declaration.`)
      return null
    }

    const input = text.match(inputPattern)
    if (input) {
      this.current += 1
      const target = parseAssignmentTarget(input[1], line, this.errors)
      return target ? { kind: 'input', target, line } : null
    }

    const output = text.match(outputPattern)
    if (output) {
      this.current += 1

      if (!output[1]?.trim()) {
        this.errors.push(`Line ${line}: Invalid OUTPUT statement.`)
        return null
      }

      const expressions = splitOutputItems(output[1], line, this.errors)
        .map((item) => parseExpression(item, line, this.errors))
        .filter((expression): expression is Expression => expression !== null)

      return expressions.length > 0 ? { kind: 'output', expressions, line } : null
    }

    if (/^IF\b/i.test(text)) return this.parseIfStatement()
    if (/^FOR\b/i.test(text)) return this.parseForStatement()
    if (/^WHILE\b/i.test(text)) return this.parseWhileStatement()
    if (/^REPEAT$/i.test(text)) return this.parseRepeatStatement()

    if (/^REPEAT\b/i.test(text)) {
      this.current += 1
      this.errors.push(`Line ${line}: Syntax error.`)
      return null
    }

    const assignment = text.match(assignmentPattern)
    if (assignment) {
      this.current += 1
      const target = parseAssignmentTarget(assignment[1], line, this.errors)
      const expression = parseExpression(assignment[2], line, this.errors)
      return target && expression ? { kind: 'assign', target, expression, line } : null
    }

    this.current += 1
    this.errors.push(`Line ${line}: Syntax error.`)
    return null
  }

  private parseIfStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(ifPattern)

    if (!match) {
      this.errors.push(`Line ${sourceLine.line}: IF statement must end with THEN.`)
      this.current += 1
      return null
    }

    const condition = parseExpression(match[1], sourceLine.line, this.errors)
    this.current += 1
    const thenBranch = this.parseBlock(['ELSE', 'ENDIF'])
    let elseBranch: Statement[] | undefined

    if (this.isAtEnd()) {
      this.errors.push(`Line ${sourceLine.line}: Missing ENDIF for IF statement.`)
      return null
    }

    if (this.peek().text.toUpperCase() === 'ELSE') {
      this.current += 1
      elseBranch = this.parseBlock(['ENDIF'])

      if (this.isAtEnd()) {
        this.errors.push(`Line ${sourceLine.line}: Missing ENDIF for IF statement.`)
        return null
      }
    }

    if (this.peek().text.toUpperCase() !== 'ENDIF') {
      this.errors.push(`Line ${sourceLine.line}: Missing ENDIF for IF statement.`)
      return null
    }

    this.current += 1
    return condition ? { kind: 'if', condition, thenBranch, elseBranch, line: sourceLine.line } : null
  }

  private parseForStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(forPattern)

    if (!match) {
      this.errors.push(`Line ${sourceLine.line}: Invalid FOR statement.`)
      this.current += 1
      return null
    }

    const counter = match[1]
    const bounds = splitForBounds(match[2], sourceLine.line, this.errors)

    if (!bounds) {
      this.current += 1
      return null
    }

    const start = parseExpression(bounds.start, sourceLine.line, this.errors)
    const end = parseExpression(bounds.end, sourceLine.line, this.errors)
    const parsedStep = bounds.step ? parseExpression(bounds.step, sourceLine.line, this.errors) : undefined
    this.current += 1
    const body = this.parseBlock(['NEXT'])

    if (this.isAtEnd()) {
      this.errors.push(`Line ${sourceLine.line}: Missing NEXT for FOR statement.`)
      return null
    }

    const nextLine = this.peek()
    const next = nextLine.text.match(nextPattern)

    if (!next) {
      this.errors.push(`Line ${nextLine.line}: Invalid NEXT statement.`)
      return null
    }

    this.current += 1

    if (next[1] !== counter) {
      this.errors.push(`Line ${nextLine.line}: NEXT variable '${next[1]}' does not match FOR counter '${counter}'.`)
      return null
    }

    return start && end && (bounds.step === undefined || parsedStep)
      ? { kind: 'for', counter, start, end, step: parsedStep ?? undefined, body, line: sourceLine.line, nextLine: nextLine.line }
      : null
  }

  private parseWhileStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(whilePattern)

    if (!match || !match[1].trim()) {
      this.errors.push(`Line ${sourceLine.line}: Invalid WHILE statement.`)
      this.current += 1
      return null
    }

    const condition = parseExpression(match[1], sourceLine.line, this.errors)
    this.current += 1
    const body = this.parseBlock(['ENDWHILE'])

    if (this.isAtEnd()) {
      this.errors.push(`Line ${sourceLine.line}: Missing ENDWHILE for WHILE statement.`)
      return null
    }

    const endLine = this.peek()
    if (endLine.text.toUpperCase() !== 'ENDWHILE') {
      this.errors.push(`Line ${sourceLine.line}: Missing ENDWHILE for WHILE statement.`)
      return null
    }

    this.current += 1
    return condition ? { kind: 'while', condition, body, line: sourceLine.line, endLine: endLine.line } : null
  }

  private parseRepeatStatement(): Statement | null {
    const sourceLine = this.peek()
    this.current += 1
    const body = this.parseBlock(['UNTIL'])

    if (this.isAtEnd()) {
      this.errors.push(`Line ${sourceLine.line}: Missing UNTIL for REPEAT statement.`)
      return null
    }

    const untilLine = this.peek()
    const until = untilLine.text.match(untilPattern)
    this.current += 1

    if (!until || !until[1].trim()) {
      this.errors.push(`Line ${untilLine.line}: Invalid UNTIL statement.`)
      return null
    }

    const untilCondition = parseExpression(until[1], untilLine.line, this.errors)
    return untilCondition ? { kind: 'repeat', body, untilCondition, line: sourceLine.line, untilLine: untilLine.line } : null
  }

  private peek(): SourceLine {
    return this.lines[this.current]
  }

  private isAtEnd(): boolean {
    return this.current >= this.lines.length
  }
}

function parseArrayDeclaration(match: RegExpMatchArray, line: number, errors: string[]): Statement | null {
  const name = match[1]
  const lowerText = match[2].trim()
  const upperText = match[3].trim()
  const elementTypeText = match[4].toUpperCase()

  if (!supportedTypes.has(elementTypeText)) {
    errors.push(`Line ${line}: Unsupported ARRAY element type '${match[4]}'.`)
    return null
  }

  if (!/^-?\d+$/.test(lowerText) || !/^-?\d+$/.test(upperText)) {
    errors.push(`Line ${line}: ARRAY bounds must be integer literals.`)
    return null
  }

  const lowerBound = Number(lowerText)
  const upperBound = Number(upperText)

  if (lowerBound > upperBound) {
    errors.push(`Line ${line}: ARRAY lower bound cannot be greater than upper bound.`)
    return null
  }

  return {
    kind: 'declareArray',
    name,
    elementType: elementTypeText as VariableType,
    lowerBound,
    upperBound,
    line,
  }
}

function parseAssignmentTarget(source: string, line: number, errors: string[]): AssignmentTarget | null {
  const text = source.trim()
  const scalar = text.match(/^([A-Za-z_][A-Za-z0-9_]*)$/)
  if (scalar) {
    return { kind: 'variable', name: scalar[1], line }
  }

  const arrayAccess = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\[(.+)]$/)
  if (arrayAccess) {
    const index = parseExpression(arrayAccess[2], line, errors)
    return index ? { kind: 'arrayElement', name: arrayAccess[1], index, line } : null
  }

  errors.push(`Line ${line}: Invalid expression.`)
  return null
}

function splitForBounds(source: string, line: number, errors: string[]): { start: string; end: string; step?: string } | null {
  const toIndex = findKeywordOutsideExpression(source, 'TO')

  if (toIndex === -1) {
    errors.push(`Line ${line}: FOR statement must use TO.`)
    return null
  }

  const start = source.slice(0, toIndex).trim()
  const afterTo = source.slice(toIndex + 2).trim()
  const stepIndex = findKeywordOutsideExpression(afterTo, 'STEP')
  const end = stepIndex === -1 ? afterTo.trim() : afterTo.slice(0, stepIndex).trim()
  const step = stepIndex === -1 ? undefined : afterTo.slice(stepIndex + 4).trim()

  if (!start || !end || step === '') {
    errors.push(`Line ${line}: Invalid FOR statement.`)
    return null
  }

  return { start, end, step }
}

function findKeywordOutsideExpression(source: string, keyword: 'TO' | 'STEP'): number {
  let depth = 0
  let inString = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue
    if (char === '(' || char === '[') depth += 1
    if (char === ')' || char === ']') depth -= 1

    if (depth === 0 && source.slice(index, index + keyword.length).toUpperCase() === keyword) {
      const before = source[index - 1] ?? ' '
      const after = source[index + keyword.length] ?? ' '
      if (!/[A-Za-z0-9_]/.test(before) && !/[A-Za-z0-9_]/.test(after)) {
        return index
      }
    }
  }

  return -1
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

    if (!inString && (char === '(' || char === '[')) depth += 1
    if (!inString && (char === ')' || char === ']')) depth -= 1

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

  if (tokenized.errors.length > 0) return null

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
    if (!this.isAtEnd()) this.error(this.peek(), 'Invalid expression.')
    return expression
  }

  private parseOr(): Expression {
    let expression = this.parseAnd()
    while (this.matchOperator('OR')) expression = this.binaryExpression(expression)
    return expression
  }

  private parseAnd(): Expression {
    let expression = this.parseComparison()
    while (this.matchOperator('AND')) expression = this.binaryExpression(expression)
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
    while (this.matchOperator('+') || this.matchOperator('-')) expression = this.binaryExpression(expression)
    return expression
  }

  private parseMultiplication(): Expression {
    let expression = this.parseUnary()
    while (this.matchOperator('*') || this.matchOperator('/') || this.matchOperator('DIV') || this.matchOperator('MOD')) {
      expression = this.binaryExpression(expression)
    }
    return expression
  }

  private parseUnary(): Expression {
    if (this.matchOperator('NOT')) {
      const operator = this.previous()
      return { kind: 'unary', operator: 'NOT', expression: this.parseUnary(), line: operator.line }
    }

    if (this.matchOperator('-')) {
      const operator = this.previous()
      return { kind: 'unary', operator: '-', expression: this.parseUnary(), line: operator.line }
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
      if (this.match('leftBracket')) {
        const index = this.parseOr()
        if (!this.match('rightBracket')) this.error(token, 'Invalid expression.')
        return { kind: 'arrayAccess', name: token.lexeme, index, line: token.line }
      }

      return { kind: 'variable', name: token.lexeme, line: token.line }
    }

    if (this.match('leftParen')) {
      const opening = this.previous()
      const expression = this.parseOr()
      if (!this.match('rightParen')) this.error(opening, 'Invalid expression.')
      return expression
    }

    const token = this.peek()
    this.error(token, 'Invalid expression.')
    if (!this.isAtEnd()) this.advance()
    return { kind: 'literal', value: 0, line: token.line }
  }

  private binaryExpression(left: Expression): Expression {
    const operator = this.previous()
    const right = this.parsePrecedenceAfter(operator.lexeme)
    return { kind: 'binary', operator: operator.lexeme as BinaryOperator, left, right, line: operator.line }
  }

  private parsePrecedenceAfter(operator: string): Expression {
    if (operator === 'OR') return this.parseAnd()
    if (operator === 'AND') return this.parseComparison()
    if (operator === '=' || operator === '<>' || operator === '<' || operator === '<=' || operator === '>' || operator === '>=') {
      return this.parseAddition()
    }
    if (operator === '+' || operator === '-') return this.parseMultiplication()
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
    if (!this.isAtEnd()) this.current += 1
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
