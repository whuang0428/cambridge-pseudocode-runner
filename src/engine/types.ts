export type VariableType = 'INTEGER' | 'REAL' | 'STRING' | 'BOOLEAN'

export type RuntimeValue = number | string | boolean

export type RunResult = {
  output: string[]
  errors: string[]
  variables: Record<string, unknown>
}

export type TokenType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'identifier'
  | 'operator'
  | 'leftParen'
  | 'rightParen'
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
      kind: 'binary'
      operator: '+' | '-' | '*' | '/'
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
      kind: 'assign'
      name: string
      expression: Expression
      line: number
    }
  | {
      kind: 'output'
      expression: Expression
      line: number
    }

export type ParseResult = {
  statements: Statement[]
  errors: string[]
}
