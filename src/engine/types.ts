export type VariableType = 'INTEGER' | 'REAL' | 'STRING' | 'BOOLEAN' | 'CHAR'
export type DataType = VariableType | string

export type RuntimeValue = number | string | boolean

export type RunResult = {
  output: string[]
  errors: string[]
  variables: Record<string, unknown>
  files: Record<string, string[]>
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
  | 'dot'
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
      kind: 'fieldAccess'
      record: Expression
      fieldName: string
      line: number
    }
  | {
      kind: 'functionCall'
      name: string
      args: Expression[]
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
      variableType: DataType
      line: number
    }
  | {
      kind: 'declareArray'
      name: string
      elementType: DataType
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
  | {
      kind: 'case'
      expression: Expression
      branches: CaseBranch[]
      otherwiseBranch?: Statement[]
      line: number
    }
  | {
      kind: 'procedure'
      name: string
      parameters: ProcedureParameter[]
      body: Statement[]
      line: number
    }
  | {
      kind: 'function'
      name: string
      parameters: FunctionParameter[]
      returnType: VariableType
      body: Statement[]
      line: number
    }
  | {
      kind: 'call'
      name: string
      args: Expression[]
      line: number
    }
  | {
      kind: 'return'
      expression: Expression
      line: number
    }
  | {
      kind: 'openFile'
      fileName: string
      mode: string
      line: number
    }
  | {
      kind: 'readFile'
      fileName: string
      target: AssignmentTarget
      line: number
    }
  | {
      kind: 'writeFile'
      fileName: string
      expression: Expression
      line: number
    }
  | {
      kind: 'closeFile'
      fileName: string
      line: number
    }
  | {
      kind: 'typeDefinition'
      name: string
      fields: RecordFieldDefinition[]
      line: number
    }

export type RecordFieldDefinition = {
  name: string
  type: VariableType
  line: number
}

export type ProcedureParameter = {
  name: string
  type: VariableType
  mode: 'BYVALUE' | 'BYREF'
}

export type FunctionParameter = {
  name: string
  type: VariableType
}

export type CaseBranch = {
  label: CaseLabel
  statements: Statement[]
  line: number
}

export type CaseLabel =
  | {
      kind: 'literal'
      value: RuntimeValue
      line: number
    }
  | {
      kind: 'comparison'
      operator: '=' | '<>' | '<' | '<=' | '>' | '>='
      value: Extract<Expression, { kind: 'literal' }>
      line: number
    }
  | {
      kind: 'range'
      lower: Extract<Expression, { kind: 'literal' }>
      upper: Extract<Expression, { kind: 'literal' }>
      line: number
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
  | {
      kind: 'recordField'
      record: RecordFieldTargetBase
      fieldName: string
      line: number
    }

export type RecordFieldTargetBase =
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
