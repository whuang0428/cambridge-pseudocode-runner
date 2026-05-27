export type VariableType = 'INTEGER' | 'REAL' | 'STRING' | 'BOOLEAN'

export type RuntimeValue = number | string | boolean

export type RunResult = {
  output: string[]
  errors: string[]
  variables: Record<string, unknown>
}

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | 'DIV'
  | 'MOD'
  | '='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'AND'
  | 'OR'

export type UnaryOperator = 'NOT' | '-'

export type TokenType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'identifier'
  | 'operator'
  | 'leftParen'
  | 'rightParen'
  | 'leftBracket'
  | 'rightBracket'
  | 'comma'
  | 'eof'

export type Token = {
  type: TokenType
  lexeme: string
  value?: RuntimeValue
  line: number
}

export type Expression =
  | {
      kind: 'literal'
      value: RuntimeValue
      line: number
    }
  | {
      kind: 'variable'
      name: string
      line: number
    }
  | {
      kind: 'arrayAccess'
      name: string
      indices: Expression[]
      line: number
    }
  | {
      kind: 'unary'
      operator: UnaryOperator
      expression: Expression
      line: number
    }
  | {
      kind: 'binary'
      operator: BinaryOperator
      left: Expression
      right: Expression
      line: number
    }

export type Statement =
  | {
      kind: 'declare'
      name: string
      variableType: VariableType
      line: number
    }
  | {
      kind: 'declareArray'
      name: string
      elementType: VariableType
      bounds: Array<{
        lower: number
        upper: number
      }>
      line: number
    }
  | {
      kind: 'assign'
      target: AssignmentTarget
      expression: Expression
      line: number
    }
  | {
      kind: 'input'
      target: AssignmentTarget
      line: number
    }
  | {
      kind: 'output'
      expressions: Expression[]
      line: number
    }
  | {
      kind: 'if'
      condition: Expression
      thenBranch: Statement[]
      elseBranch?: Statement[]
      line: number
    }
  | {
      kind: 'for'
      counter: string
      start: Expression
      end: Expression
      step?: Expression
      body: Statement[]
      line: number
      nextLine?: number
    }
  | {
      kind: 'while'
      condition: Expression
      body: Statement[]
      line: number
      endLine?: number
    }
  | {
      kind: 'repeat'
      body: Statement[]
      untilCondition: Expression
      line: number
      untilLine: number
    }

export type AssignmentTarget =
  | {
      kind: 'variable'
      name: string
      line: number
    }
  | {
      kind: 'arrayElement'
      name: string
      indices: Expression[]
      line: number
    }

export type ParseResult = {
  statements: Statement[]
  errors: string[]
}
