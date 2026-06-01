import { tokenizeExpression } from './tokenizer'
import type {
  AssignmentTarget,
  BinaryOperator,
  CaseBranch,
  CaseLabel,
  DataType,
  Expression,
  FunctionParameter,
  ParseResult,
  ProcedureParameter,
  Statement,
  Token,
  VariableType,
} from './types'

type SourceLine = { line: number; text: string }
type StopToken =
  | 'ELSE'
  | 'ENDIF'
  | 'NEXT'
  | 'ENDWHILE'
  | 'UNTIL'
  | 'OTHERWISE'
  | 'ENDCASE'
  | 'CASE_LABEL'
  | 'ENDPROCEDURE'
  | 'ENDFUNCTION'
  | 'ENDTYPE'

const scalarDeclarationPattern = /^DECLARE\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)$/i
const arrayDeclarationPattern = /^DECLARE\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*ARRAY\s*\[(.+)]\s+OF\s+([A-Za-z_][A-Za-z0-9_]*)$/i
const inputPattern = /^INPUT\s+(.+)$/i
const outputPattern = /^OUTPUT(?:\s+(.+))?$/i
const assignmentPattern = /^(.+?)\s*(?:←|<-|=)\s*(.+)$/
const ifPattern = /^IF\s+(.+?)(?:\s+THEN)?$/i
const nextPattern = /^NEXT(?:\s+([A-Za-z_][A-Za-z0-9_]*))?$/i
const forPattern = /^FOR\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:←|<-|=)\s+(.+)$/i
const whilePattern = /^WHILE\s+(.+)$/i
const untilPattern = /^UNTIL\s+(.+)$/i
const casePattern = /^CASE\s+OF\s+(.+)$/i
const otherwisePattern = /^OTHERWISE(?:\s+(.+))?$/i
const procedurePattern = /^PROCEDURE\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\((.*)\))?$/i
const functionPattern = /^FUNCTION\s+([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)\s+RETURNS\s+([A-Za-z_][A-Za-z0-9_]*)$/i
const callPattern = /^CALL\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\((.*)\))?$/i
const returnPattern = /^RETURN\s+(.+)$/i
const openFilePattern = /^OPENFILE\s+(.+)\s+FOR\s+([A-Za-z_][A-Za-z0-9_]*)$/i
const readFilePattern = /^READFILE\s+(.+)$/i
const writeFilePattern = /^WRITEFILE\s+(.+)$/i
const closeFilePattern = /^CLOSEFILE\s+(.+)$/i
const typePattern = /^TYPE\s+([A-Za-z_][A-Za-z0-9_]*)$/i
const supportedTypes = new Set(['INTEGER', 'REAL', 'STRING', 'BOOLEAN', 'CHAR'])

export function parsePseudocode(code: string): ParseResult {
  const errors: string[] = []
  const lines = code
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((rawLine, index) => ({ line: index + 1, text: normalizeSourceLine(rawLine) }))
    .filter((sourceLine) => sourceLine.text.length > 0)

  const parser = new StatementParser(lines, errors)
  return { statements: parser.parseProgram(), errors }
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

      if (upper === 'ELSE') this.errors.push(`Line ${sourceLine.line}: ELSE without matching IF.`)
      else if (upper === 'ENDIF') this.errors.push(`Line ${sourceLine.line}: ENDIF without matching IF.`)
      else if (upper === 'ENDWHILE') this.errors.push(`Line ${sourceLine.line}: ENDWHILE without matching WHILE.`)
      else if (upper === 'ENDCASE') this.errors.push(`Line ${sourceLine.line}: ENDCASE without matching CASE.`)
      else if (upper === 'ENDPROCEDURE') this.errors.push(`Line ${sourceLine.line}: ENDPROCEDURE without matching PROCEDURE.`)
      else if (upper === 'ENDFUNCTION') this.errors.push(`Line ${sourceLine.line}: ENDFUNCTION without matching FUNCTION.`)
      else if (upper === 'ENDTYPE') this.errors.push(`Line ${sourceLine.line}: ENDTYPE without matching TYPE.`)
      else if (/^RETURN\b/i.test(sourceLine.text)) this.errors.push(`Line ${sourceLine.line}: RETURN outside FUNCTION.`)
      else if (/^OTHERWISE\b/i.test(sourceLine.text)) this.errors.push(`Line ${sourceLine.line}: OTHERWISE without matching CASE.`)
      else if (/^UNTIL\b/i.test(sourceLine.text)) this.errors.push(`Line ${sourceLine.line}: UNTIL without matching REPEAT.`)
      else if (/^NEXT\b/i.test(sourceLine.text)) this.errors.push(`Line ${sourceLine.line}: NEXT without matching FOR.`)
      else this.errors.push(`Line ${sourceLine.line}: Syntax error.`)

      this.current += 1
    }

    return statements
  }

  parseBlock(stopTokens: StopToken[]): Statement[] {
    const statements: Statement[] = []

    while (!this.isAtEnd()) {
      const sourceLine = this.peek()
      const upper = sourceLine.text.toUpperCase()

      if (
        upper === 'ELSE' ||
        upper === 'ENDIF' ||
        upper === 'ENDWHILE' ||
        upper === 'ENDCASE' ||
        upper === 'ENDPROCEDURE' ||
        upper === 'ENDFUNCTION' ||
        upper === 'ENDTYPE' ||
        /^OTHERWISE\b/i.test(sourceLine.text) ||
        /^NEXT\b/i.test(sourceLine.text) ||
        /^UNTIL\b/i.test(sourceLine.text) ||
        isPotentialCaseLabel(sourceLine.text)
      ) {
        if (upper === 'ELSE' && stopTokens.includes('ELSE')) return statements
        if (upper === 'ENDIF' && stopTokens.includes('ENDIF')) return statements
        if (upper === 'ENDWHILE' && stopTokens.includes('ENDWHILE')) return statements
        if (upper === 'ENDCASE' && stopTokens.includes('ENDCASE')) return statements
        if (upper === 'ENDPROCEDURE' && stopTokens.includes('ENDPROCEDURE')) return statements
        if (upper === 'ENDFUNCTION' && stopTokens.includes('ENDFUNCTION')) return statements
        if (upper === 'ENDTYPE' && stopTokens.includes('ENDTYPE')) return statements
        if (/^OTHERWISE\b/i.test(sourceLine.text) && stopTokens.includes('OTHERWISE')) return statements
        if (/^NEXT\b/i.test(sourceLine.text) && stopTokens.includes('NEXT')) return statements
        if (/^UNTIL\b/i.test(sourceLine.text) && stopTokens.includes('UNTIL')) return statements
        if (isPotentialCaseLabel(sourceLine.text) && stopTokens.includes('CASE_LABEL')) return statements
        return statements
      }

      const statement = this.parseStatement()
      if (statement) statements.push(statement)
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
        variableType: normalizeDataTypeName(scalarDeclaration[2]),
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
      const expressions = splitCommaItems(output[1], line, this.errors, 'Invalid OUTPUT statement.')
        .map((item) => parseExpression(item, line, this.errors))
        .filter((expression): expression is Expression => expression !== null)
      return expressions.length > 0 ? { kind: 'output', expressions, line } : null
    }

    if (/^IF\b/i.test(text)) return this.parseIfStatement()
    if (/^FOR\b/i.test(text)) return this.parseForStatement()
    if (/^WHILE\b/i.test(text)) return this.parseWhileStatement()
    if (/^REPEAT$/i.test(text)) return this.parseRepeatStatement()
    if (/^CASE\b/i.test(text)) return this.parseCaseStatement()
    if (/^TYPE\b/i.test(text)) return this.parseTypeStatement()
    if (/^PROCEDURE\b/i.test(text)) return this.parseProcedureStatement()
    if (/^FUNCTION\b/i.test(text)) return this.parseFunctionStatement()
    if (/^CALL\b/i.test(text)) return this.parseCallStatement()
    if (/^RETURN\b/i.test(text)) return this.parseReturnStatement()
    if (/^OPENFILE\b/i.test(text)) return this.parseOpenFileStatement()
    if (/^READFILE\b/i.test(text)) return this.parseReadFileStatement()
    if (/^WRITEFILE\b/i.test(text)) return this.parseWriteFileStatement()
    if (/^CLOSEFILE\b/i.test(text)) return this.parseCloseFileStatement()
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
    if (next[1] && next[1].toUpperCase() !== counter.toUpperCase()) {
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

  private parseProcedureStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(procedurePattern)

    if (!match) {
      this.errors.push(`Line ${sourceLine.line}: Invalid PROCEDURE parameter list.`)
      this.current += 1
      return null
    }

    const parameters = parseProcedureParameters(match[2], match[1], sourceLine.line, this.errors)
    this.current += 1
    const body = this.parseBlock(['ENDPROCEDURE'])

    if (this.isAtEnd()) {
      this.errors.push(`Line ${sourceLine.line}: Missing ENDPROCEDURE for PROCEDURE '${match[1]}'.`)
      return null
    }

    if (this.peek().text.toUpperCase() !== 'ENDPROCEDURE') {
      this.errors.push(`Line ${sourceLine.line}: Missing ENDPROCEDURE for PROCEDURE '${match[1]}'.`)
      return null
    }

    this.current += 1
    return parameters ? { kind: 'procedure', name: match[1], parameters, body, line: sourceLine.line } : null
  }

  private parseFunctionStatement(): Statement | null {
    const sourceLine = this.peek()

    if (!/\bRETURNS\b/i.test(sourceLine.text)) {
      this.errors.push(`Line ${sourceLine.line}: FUNCTION statement must include RETURNS.`)
      this.current += 1
      this.skipToEndFunction()
      return null
    }

    const match = sourceLine.text.match(functionPattern)
    if (!match) {
      this.errors.push(`Line ${sourceLine.line}: Invalid FUNCTION statement.`)
      this.current += 1
      this.skipToEndFunction()
      return null
    }

    const returnTypeText = match[3].toUpperCase()
    if (!supportedTypes.has(returnTypeText)) {
      this.errors.push(`Line ${sourceLine.line}: Unsupported return type '${match[3]}'.`)
      this.current += 1
      this.skipToEndFunction()
      return null
    }

    const parameters = parseFunctionParameters(match[2], match[1], sourceLine.line, this.errors)
    this.current += 1
    const body = this.parseBlock(['ENDFUNCTION'])

    if (this.isAtEnd()) {
      this.errors.push(`Line ${sourceLine.line}: Missing ENDFUNCTION for FUNCTION '${match[1]}'.`)
      return null
    }

    if (this.peek().text.toUpperCase() !== 'ENDFUNCTION') {
      this.errors.push(`Line ${sourceLine.line}: Missing ENDFUNCTION for FUNCTION '${match[1]}'.`)
      return null
    }

    this.current += 1
    return parameters
      ? { kind: 'function', name: match[1], parameters, returnType: returnTypeText as VariableType, body, line: sourceLine.line }
      : null
  }

  private parseCallStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(callPattern)
    this.current += 1

    if (!match) {
      this.errors.push(`Line ${sourceLine.line}: Invalid CALL statement.`)
      return null
    }

    const argsText = match[2]
    const args =
      argsText === undefined
        ? []
        : splitCommaItems(argsText, sourceLine.line, this.errors, 'Invalid CALL statement.')
            .map((item) => parseExpression(item, sourceLine.line, this.errors))
            .filter((expression): expression is Expression => expression !== null)

    if (argsText !== undefined && argsText.trim() !== '' && args.length === 0) return null

    return { kind: 'call', name: match[1], args, line: sourceLine.line }
  }

  private parseReturnStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(returnPattern)
    this.current += 1

    if (!match || !match[1].trim()) {
      this.errors.push(`Line ${sourceLine.line}: Invalid expression.`)
      return null
    }

    const expression = parseExpression(match[1], sourceLine.line, this.errors)
    return expression ? { kind: 'return', expression, line: sourceLine.line } : null
  }

  private parseOpenFileStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(openFilePattern)
    this.current += 1

    if (!match) {
      this.errors.push(`Line ${sourceLine.line}: Invalid OPENFILE statement.`)
      return null
    }

    const fileName = parseFileNameLiteral(match[1], sourceLine.line, this.errors)
    return fileName ? { kind: 'openFile', fileName, mode: match[2].toUpperCase(), line: sourceLine.line } : null
  }

  private parseReadFileStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(readFilePattern)
    this.current += 1

    if (!match) {
      this.errors.push(`Line ${sourceLine.line}: Invalid READFILE statement.`)
      return null
    }

    const parts = splitCommaItems(match[1], sourceLine.line, this.errors, 'Invalid READFILE statement.')
    if (parts.length !== 2) {
      this.errors.push(`Line ${sourceLine.line}: Invalid READFILE statement.`)
      return null
    }

    const fileName = parseFileNameLiteral(parts[0], sourceLine.line, this.errors)
    const target = parseAssignmentTarget(parts[1], sourceLine.line, this.errors)
    return fileName && target ? { kind: 'readFile', fileName, target, line: sourceLine.line } : null
  }

  private parseWriteFileStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(writeFilePattern)
    this.current += 1

    if (!match) {
      this.errors.push(`Line ${sourceLine.line}: Invalid WRITEFILE statement.`)
      return null
    }

    const parts = splitCommaItems(match[1], sourceLine.line, this.errors, 'Invalid WRITEFILE statement.')
    if (parts.length !== 2) {
      this.errors.push(`Line ${sourceLine.line}: Invalid WRITEFILE statement.`)
      return null
    }

    const fileName = parseFileNameLiteral(parts[0], sourceLine.line, this.errors)
    const expression = parseExpression(parts[1], sourceLine.line, this.errors)
    return fileName && expression ? { kind: 'writeFile', fileName, expression, line: sourceLine.line } : null
  }

  private parseCloseFileStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(closeFilePattern)
    this.current += 1

    if (!match) {
      this.errors.push(`Line ${sourceLine.line}: Invalid CLOSEFILE statement.`)
      return null
    }

    const fileName = parseFileNameLiteral(match[1], sourceLine.line, this.errors)
    return fileName ? { kind: 'closeFile', fileName, line: sourceLine.line } : null
  }

  private parseTypeStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(typePattern)

    if (!match) {
      this.errors.push(`Line ${sourceLine.line}: Invalid TYPE statement.`)
      this.current += 1
      return null
    }

    this.current += 1
    const fields = []
    const fieldNames = new Set<string>()

    while (!this.isAtEnd()) {
      const currentLine = this.peek()
      if (currentLine.text.toUpperCase() === 'ENDTYPE') {
        this.current += 1
        return { kind: 'typeDefinition', name: match[1], fields, line: sourceLine.line }
      }

      const field = currentLine.text.match(scalarDeclarationPattern)
      this.current += 1
      if (!field) {
        this.errors.push(`Line ${currentLine.line}: Invalid field declaration.`)
        continue
      }

      const typeText = field[2].toUpperCase()
      if (!supportedTypes.has(typeText)) {
        this.errors.push(`Line ${currentLine.line}: Unsupported field type '${field[2]}'.`)
        continue
      }

      const key = field[1].toUpperCase()
      if (fieldNames.has(key)) {
        this.errors.push(`Line ${currentLine.line}: Field '${field[1]}' has already been declared in type '${match[1]}'.`)
        continue
      }

      fieldNames.add(key)
      fields.push({ name: field[1], type: typeText as VariableType, line: currentLine.line })
    }

    this.errors.push(`Line ${sourceLine.line}: Missing ENDTYPE for TYPE '${match[1]}'.`)
    return null
  }

  private parseCaseStatement(): Statement | null {
    const sourceLine = this.peek()
    const match = sourceLine.text.match(casePattern)

    if (!match || !match[1].trim()) {
      this.errors.push(`Line ${sourceLine.line}: Invalid CASE statement.`)
      this.current += 1
      this.skipToEndCase()
      return null
    }

    const expression = parseExpression(match[1], sourceLine.line, this.errors)
    this.current += 1
    const branches: CaseBranch[] = []
    let otherwiseBranch: Statement[] | undefined

    while (!this.isAtEnd()) {
      const currentLine = this.peek()
      const upper = currentLine.text.toUpperCase()

      if (upper === 'ENDCASE') {
        this.current += 1
        return expression ? { kind: 'case', expression, branches, otherwiseBranch, line: sourceLine.line } : null
      }

      if (otherwiseBranch) {
        if (/^OTHERWISE\b/i.test(currentLine.text)) {
          this.errors.push(`Line ${currentLine.line}: CASE statement cannot have more than one OTHERWISE branch.`)
        } else {
          this.errors.push(`Line ${currentLine.line}: OTHERWISE must be the last branch in a CASE statement.`)
        }
        this.current += 1
        continue
      }

      if (/^OTHERWISE\b/i.test(currentLine.text)) {
        otherwiseBranch = this.parseOtherwiseBranch()
        continue
      }

      const branch = this.parseCaseBranch()
      if (branch) branches.push(branch)
    }

    this.errors.push(`Line ${sourceLine.line}: Missing ENDCASE for CASE statement.`)
    return null
  }

  private parseCaseBranch(): CaseBranch | null {
    const sourceLine = this.peek()
    const split = splitCaseLabel(sourceLine.text)

    if (!split) {
      this.errors.push(`Line ${sourceLine.line}: CASE label must end with ':'.`)
      this.current += 1
      return null
    }

    const label = parseCaseLabel(split.label, sourceLine.line, this.errors)

    this.current += 1
    const statements = split.statement
      ? parseInlineStatement(split.statement, sourceLine.line, this.errors)
      : this.parseBlock(['CASE_LABEL', 'OTHERWISE', 'ENDCASE'])

    return label ? { label, statements, line: sourceLine.line } : null
  }

  private parseOtherwiseBranch(): Statement[] {
    const sourceLine = this.peek()
    const otherwise = sourceLine.text.match(otherwisePattern)
    this.current += 1

    if (!otherwise) return []
    return otherwise[1]?.trim()
      ? parseInlineStatement(otherwise[1], sourceLine.line, this.errors)
      : this.parseBlock(['CASE_LABEL', 'OTHERWISE', 'ENDCASE'])
  }

  private peek(): SourceLine {
    return this.lines[this.current]
  }

  private isAtEnd(): boolean {
    return this.current >= this.lines.length
  }

  private skipToEndCase(): void {
    while (!this.isAtEnd()) {
      if (this.peek().text.toUpperCase() === 'ENDCASE') {
        this.current += 1
        return
      }
      this.current += 1
    }
  }

  private skipToEndFunction(): void {
    while (!this.isAtEnd()) {
      if (this.peek().text.toUpperCase() === 'ENDFUNCTION') {
        this.current += 1
        return
      }
      this.current += 1
    }
  }
}

function normalizeSourceLine(rawLine: string): string {
  return normalizeEndKeyword(stripComments(rawLine)).trim()
}

function stripComments(rawLine: string): string {
  let inString = false

  for (let index = 0; index < rawLine.length; index += 1) {
    const char = rawLine[index]
    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue
    if (char === '#') return rawLine.slice(0, index)
    if (char === '/' && rawLine[index + 1] === '/') return rawLine.slice(0, index)
  }

  return rawLine
}

function normalizeEndKeyword(line: string): string {
  const trimmed = line.trim()
  const aliases: Record<string, string> = {
    'END IF': 'ENDIF',
    'END WHILE': 'ENDWHILE',
    'END PROCEDURE': 'ENDPROCEDURE',
    'END FUNCTION': 'ENDFUNCTION',
    'END TYPE': 'ENDTYPE',
    'END CASE': 'ENDCASE',
  }

  return aliases[trimmed.toUpperCase()] ?? line
}

function parseInlineStatement(text: string, line: number, errors: string[]): Statement[] {
  return new StatementParser([{ line, text: text.trim() }], errors).parseBlock([])
}

function parseFileNameLiteral(source: string, line: number, errors: string[]): string | null {
  const match = source.trim().match(/^"([^"]*)"$/)
  if (!match) {
    errors.push(`Line ${line}: File name must be a string literal.`)
    return null
  }

  return match[1]
}

function splitCaseLabel(text: string): { label: string; statement?: string } | null {
  let inString = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === '"') inString = !inString
    if (!inString && char === ':') {
      const label = text.slice(0, index).trim()
      const statement = text.slice(index + 1).trim()
      return label ? { label, statement: statement || undefined } : null
    }
  }

  return null
}

function isPotentialCaseLabel(text: string): boolean {
  const trimmed = text.trim()
  return /^(?:=|<>|<=|>=|<|>)?\s*("[^"]*"|-?\d+(?:\.\d+)?|TRUE|FALSE|[A-Za-z_][A-Za-z0-9_]*)(?:\s+TO\s+("[^"]*"|-?\d+(?:\.\d+)?|TRUE|FALSE|[A-Za-z_][A-Za-z0-9_]*))?\s*:/i.test(trimmed)
}

function parseCaseLabel(source: string, line: number, errors: string[]): CaseLabel | null {
  const text = source.trim()
  const comparison = text.match(/^(=|<>|<=|>=|<|>)\s*(.+)$/)

  if (comparison) {
    const value = parseLiteralCaseExpression(comparison[2], line, errors)
    if (!value) {
      errors.push(`Line ${line}: Invalid CASE comparison label.`)
      return null
    }

    return {
      kind: 'comparison',
      operator: comparison[1] as Extract<CaseLabel, { kind: 'comparison' }>['operator'],
      value,
      line,
    }
  }

  if (/^(=|<>|<=|>=|<|>)\s*$/.test(text)) {
    errors.push(`Line ${line}: Invalid CASE comparison label.`)
    return null
  }

  const toIndex = findKeywordOutsideExpression(text, 'TO')
  if (toIndex !== -1) {
    const lowerText = text.slice(0, toIndex).trim()
    const upperText = text.slice(toIndex + 2).trim()
    const lower = parseLiteralCaseExpression(lowerText, line, errors)
    const upper = parseLiteralCaseExpression(upperText, line, errors)

    if (!lower || !upper) {
      errors.push(`Line ${line}: Invalid CASE range label.`)
      return null
    }

    return { kind: 'range', lower, upper, line }
  }

  const label = parseExpression(text, line, errors)
  if (label && label.kind !== 'literal') {
    errors.push(`Line ${line}: CASE label must be a literal value.`)
    return null
  }

  return label?.kind === 'literal' ? { kind: 'literal', value: label.value, line } : null
}

function parseLiteralCaseExpression(source: string, line: number, errors: string[]): Extract<Expression, { kind: 'literal' }> | null {
  const expression = parseExpression(source, line, errors)
  return expression?.kind === 'literal' ? expression : null
}

function parseProcedureParameters(
  source: string | undefined,
  procedureName: string,
  line: number,
  errors: string[],
): ProcedureParameter[] | null {
  if (source === undefined || source.trim() === '') return []

  const parameters: ProcedureParameter[] = []
  const names = new Set<string>()
  const parts = splitCommaItems(source, line, errors, 'Invalid PROCEDURE parameter list.')

  for (const part of parts) {
    const trimmed = part.trim()
    const missingType = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)$/)
    if (missingType) {
      errors.push(`Line ${line}: Missing parameter type for '${missingType[1]}'.`)
      return null
    }

    const parameter = trimmed.match(/^(?:(BY[A-Za-z_][A-Za-z0-9_]*)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)$/)
    if (!parameter) {
      errors.push(`Line ${line}: Invalid PROCEDURE parameter list.`)
      return null
    }

    const modeText = parameter[1]?.toUpperCase()
    if (modeText && modeText !== 'BYVALUE' && modeText !== 'BYREF') {
      errors.push(`Line ${line}: Invalid parameter mode '${parameter[1]}'.`)
      return null
    }

    const name = parameter[2]
    const typeText = parameter[3].toUpperCase()
    if (!supportedTypes.has(typeText)) {
      errors.push(`Line ${line}: Unsupported parameter type '${parameter[3]}'.`)
      return null
    }

    const key = name.toUpperCase()
    if (names.has(key)) {
      errors.push(`Line ${line}: Duplicate parameter name '${name}' in procedure '${procedureName}'.`)
      return null
    }

    names.add(key)
    parameters.push({ name, type: typeText as VariableType, mode: modeText === 'BYREF' ? 'BYREF' : 'BYVALUE' })
  }

  return parameters
}

function parseFunctionParameters(
  source: string,
  functionName: string,
  line: number,
  errors: string[],
): FunctionParameter[] | null {
  if (source.trim() === '') return []

  const parameters: FunctionParameter[] = []
  const names = new Set<string>()
  const parts = splitCommaItems(source, line, errors, 'Invalid FUNCTION parameter list.')

  for (const part of parts) {
    const trimmed = part.trim()
    const missingType = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)$/)
    if (missingType) {
      errors.push(`Line ${line}: Missing parameter type for '${missingType[1]}'.`)
      return null
    }

    const parameter = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)$/)
    if (!parameter) {
      errors.push(`Line ${line}: Invalid FUNCTION parameter list.`)
      return null
    }

    const name = parameter[1]
    const typeText = parameter[2].toUpperCase()
    if (!supportedTypes.has(typeText)) {
      errors.push(`Line ${line}: Unsupported parameter type '${parameter[2]}'.`)
      return null
    }

    const key = name.toUpperCase()
    if (names.has(key)) {
      errors.push(`Line ${line}: Duplicate parameter name '${name}' in function '${functionName}'.`)
      return null
    }

    names.add(key)
    parameters.push({ name, type: typeText as VariableType })
  }

  return parameters
}

function parseArrayDeclaration(match: RegExpMatchArray, line: number, errors: string[]): Statement | null {
  const name = match[1]
  const boundsText = match[2]
  const elementTypeText = normalizeDataTypeName(match[3])

  const boundParts = splitCommaItems(boundsText, line, errors, 'Invalid ARRAY declaration.')
  if (boundParts.length < 1 || boundParts.length > 2) {
    errors.push(`Line ${line}: Invalid ARRAY declaration.`)
    return null
  }

  const bounds = boundParts.map((part) => {
    const pieces = part.split(':').map((piece) => piece.trim())
    if (pieces.length !== 2) return null
    const [lowerText, upperText] = pieces
    if (!/^-?\d+$/.test(lowerText) || !/^-?\d+$/.test(upperText)) return null
    return { lower: Number(lowerText), upper: Number(upperText) }
  })

  if (bounds.some((bound) => bound === null)) {
    errors.push(`Line ${line}: ARRAY bounds must be integer literals.`)
    return null
  }

  const checkedBounds = bounds as Array<{ lower: number; upper: number }>
  if (checkedBounds.some((bound) => bound.lower > bound.upper)) {
    errors.push(`Line ${line}: ARRAY lower bound cannot be greater than upper bound.`)
    return null
  }

  return { kind: 'declareArray', name, elementType: elementTypeText, bounds: checkedBounds, line }
}

function parseAssignmentTarget(source: string, line: number, errors: string[]): AssignmentTarget | null {
  const text = source.trim()
  const fieldSplit = splitFieldAccess(text)
  if (fieldSplit) {
    const record = parseRecordFieldTargetBase(fieldSplit.base, line, errors)
    return record ? { kind: 'recordField', record, fieldName: fieldSplit.field, line } : null
  }

  const scalar = text.match(/^([A-Za-z_][A-Za-z0-9_]*)$/)
  if (scalar) return { kind: 'variable', name: scalar[1], line }

  const arrayAccess = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\[(.+)]$/)
  if (arrayAccess) {
    const indices = parseIndexList(arrayAccess[2], line, errors)
    return indices ? { kind: 'arrayElement', name: arrayAccess[1], indices, line } : null
  }

  errors.push(`Line ${line}: Invalid expression.`)
  return null
}

function parseRecordFieldTargetBase(source: string, line: number, errors: string[]): AssignmentTarget & { kind: 'variable' | 'arrayElement' } | null {
  const scalar = source.match(/^([A-Za-z_][A-Za-z0-9_]*)$/)
  if (scalar) return { kind: 'variable', name: scalar[1], line }

  const arrayAccess = source.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\[(.+)]$/)
  if (arrayAccess) {
    const indices = parseIndexList(arrayAccess[2], line, errors)
    return indices ? { kind: 'arrayElement', name: arrayAccess[1], indices, line } : null
  }

  errors.push(`Line ${line}: Invalid record field target.`)
  return null
}

function splitFieldAccess(source: string): { base: string; field: string } | null {
  let depth = 0
  let inString = false

  for (let index = source.length - 1; index >= 0; index -= 1) {
    const char = source[index]
    if (char === '"') inString = !inString
    if (inString) continue
    if (char === ']' || char === ')') depth += 1
    if (char === '[' || char === '(') depth -= 1
    if (depth === 0 && char === '.') {
      const base = source.slice(0, index).trim()
      const field = source.slice(index + 1).trim()
      return base && /^[A-Za-z_][A-Za-z0-9_]*$/.test(field) ? { base, field } : null
    }
  }

  return null
}

function normalizeDataTypeName(typeName: string): DataType {
  const upper = typeName.toUpperCase()
  return supportedTypes.has(upper) ? (upper as VariableType) : typeName
}

function parseIndexList(source: string, line: number, errors: string[]): Expression[] | null {
  const indices = splitCommaItems(source, line, errors, 'Invalid expression.')
    .map((item) => parseExpression(item, line, errors))
    .filter((expression): expression is Expression => expression !== null)

  return indices.length > 0 ? indices : null
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
      if (!/[A-Za-z0-9_]/.test(before) && !/[A-Za-z0-9_]/.test(after)) return index
    }
  }
  return -1
}

function splitCommaItems(source: string, line: number, errors: string[], message: string): string[] {
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
      if (!current.trim()) errors.push(`Line ${line}: ${message}`)
      else items.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  if (inString || depth !== 0) {
    items.push(source.trim())
    return items
  }

  if (!current.trim()) errors.push(`Line ${line}: ${message}`)
  else items.push(current.trim())
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
    let expression: Expression

    if (this.match('number') || this.match('string') || this.match('boolean')) {
      const token = this.previous()
      expression = { kind: 'literal', value: token.value!, line: token.line }
      return this.parsePostfix(expression)
    } else if (this.match('identifier')) {
      const token = this.previous()
      if (this.match('leftParen')) {
        const args: Expression[] = []
        if (!this.check('rightParen')) {
          args.push(this.parseOr())
          while (this.match('comma')) args.push(this.parseOr())
        }
        if (!this.match('rightParen')) this.error(token, 'Invalid expression.')
        expression = { kind: 'functionCall', name: token.lexeme.toUpperCase(), args, line: token.line }
      } else if (this.match('leftBracket')) {
        const indices: Expression[] = [this.parseOr()]
        while (this.match('comma')) indices.push(this.parseOr())
        if (!this.match('rightBracket')) this.error(token, 'Invalid expression.')
        expression = { kind: 'arrayAccess', name: token.lexeme, indices, line: token.line }
      } else {
        expression = { kind: 'variable', name: token.lexeme, line: token.line }
      }
      return this.parsePostfix(expression)
    } else if (this.match('leftParen')) {
      const opening = this.previous()
      expression = this.parseOr()
      if (!this.match('rightParen')) this.error(opening, 'Invalid expression.')
      return this.parsePostfix(expression)
    }

    const token = this.peek()
    this.error(token, 'Invalid expression.')
    if (!this.isAtEnd()) this.advance()
    return { kind: 'literal', value: 0, line: token.line }
  }

  private parsePostfix(expression: Expression): Expression {
    let result = expression

    while (this.match('dot')) {
      const dot = this.previous()
      if (!this.match('identifier')) {
        this.error(dot, 'Invalid expression.')
        return result
      }

      const field = this.previous()
      result = { kind: 'fieldAccess', record: result, fieldName: field.lexeme, line: dot.line }
    }

    return result
  }

  private binaryExpression(left: Expression): Expression {
    const operator = this.previous()
    return { kind: 'binary', operator: operator.lexeme as BinaryOperator, left, right: this.parsePrecedenceAfter(operator.lexeme), line: operator.line }
  }

  private parsePrecedenceAfter(operator: string): Expression {
    if (operator === 'OR') return this.parseAnd()
    if (operator === 'AND') return this.parseComparison()
    if (operator === '=' || operator === '<>' || operator === '<' || operator === '<=' || operator === '>' || operator === '>=') return this.parseAddition()
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
