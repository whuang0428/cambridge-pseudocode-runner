import type { AssignmentTarget, Expression, RuntimeValue, RunResult, Statement, VariableType } from './types'

const maxExecutionSteps = 100000

type ScalarVariable = {
  kind: 'scalar'
  type: VariableType
  value: RuntimeValue
}

type ArrayVariable = {
  kind: 'array'
  elementType: VariableType
  lowerBound: number
  upperBound: number
  values: Map<number, RuntimeValue>
}

type StoredVariable = ScalarVariable | ArrayVariable

type RuntimeState = {
  output: string[]
  errors: string[]
  variables: Map<string, StoredVariable>
  inputLines: string[]
  inputIndex: number
  steps: number
}

type EvaluationResult =
  | {
      ok: true
      value: RuntimeValue
    }
  | {
      ok: false
      error: string
    }

type TargetResult =
  | {
      ok: true
      name: string
      type: VariableType
      value: RuntimeValue
      setValue: (value: RuntimeValue) => void
      arrayName?: string
    }
  | {
      ok: false
      error: string
    }

export function interpret(statements: Statement[], inputText = '', initialErrors: string[] = []): RunResult {
  const state: RuntimeState = {
    output: [],
    errors: [...initialErrors],
    variables: new Map<string, StoredVariable>(),
    inputLines: inputText.replace(/\r\n/g, '\n').split('\n'),
    inputIndex: 0,
    steps: 0,
  }

  if (state.errors.length === 0) {
    executeStatements(statements, state)
  }

  return {
    output: state.output,
    errors: state.errors,
    variables: toPublicVariables(state.variables),
  }
}

function executeStatements(statements: Statement[], state: RuntimeState): void {
  for (const statement of statements) {
    executeStatement(statement, state)

    if (state.errors.length > 0) return
  }
}

function executeStatement(statement: Statement, state: RuntimeState): void {
  if (!consumeExecutionStep(statement.line, state)) return

  if (statement.kind === 'declare') {
    executeScalarDeclaration(statement, state)
    return
  }

  if (statement.kind === 'declareArray') {
    executeArrayDeclaration(statement, state)
    return
  }

  if (statement.kind === 'input') {
    executeInput(statement, state)
    return
  }

  if (statement.kind === 'assign') {
    executeAssignment(statement, state)
    return
  }

  if (statement.kind === 'output') {
    executeOutput(statement, state)
    return
  }

  if (statement.kind === 'if') {
    executeIf(statement, state)
    return
  }

  if (statement.kind === 'while') {
    executeWhile(statement, state)
    return
  }

  if (statement.kind === 'repeat') {
    executeRepeat(statement, state)
    return
  }

  executeFor(statement, state)
}

function executeScalarDeclaration(statement: Extract<Statement, { kind: 'declare' }>, state: RuntimeState): void {
  if (state.variables.has(statement.name)) {
    state.errors.push(`Line ${statement.line}: Variable '${statement.name}' has already been declared.`)
    return
  }

  state.variables.set(statement.name, {
    kind: 'scalar',
    type: statement.variableType,
    value: defaultValue(statement.variableType),
  })
}

function executeArrayDeclaration(statement: Extract<Statement, { kind: 'declareArray' }>, state: RuntimeState): void {
  if (state.variables.has(statement.name)) {
    state.errors.push(`Line ${statement.line}: Variable '${statement.name}' has already been declared.`)
    return
  }

  const values = new Map<number, RuntimeValue>()
  for (let index = statement.lowerBound; index <= statement.upperBound; index += 1) {
    values.set(index, defaultValue(statement.elementType))
  }

  state.variables.set(statement.name, {
    kind: 'array',
    elementType: statement.elementType,
    lowerBound: statement.lowerBound,
    upperBound: statement.upperBound,
    values,
  })
}

function executeInput(statement: Extract<Statement, { kind: 'input' }>, state: RuntimeState): void {
  const target = resolveTarget(statement.target, state.variables)

  if (!target.ok) {
    state.errors.push(target.error)
    return
  }

  if (state.inputIndex >= state.inputLines.length || (state.inputLines.length === 1 && state.inputLines[0] === '')) {
    state.errors.push(`Line ${statement.line}: Not enough input values.`)
    return
  }

  const rawInput = state.inputLines[state.inputIndex]
  state.inputIndex += 1
  const converted = convertInput(rawInput, target.type, statement.line)

  if (!converted.ok) {
    state.errors.push(converted.error)
    return
  }

  target.setValue(converted.value)
}

function executeAssignment(statement: Extract<Statement, { kind: 'assign' }>, state: RuntimeState): void {
  const target = resolveTarget(statement.target, state.variables)

  if (!target.ok) {
    state.errors.push(target.error)
    return
  }

  const evaluated = evaluateExpression(statement.expression, state.variables)
  if (!evaluated.ok) {
    state.errors.push(evaluated.error)
    return
  }

  if (!canAssign(target.type, evaluated.value)) {
    if (target.arrayName) {
      state.errors.push(
        `Line ${statement.line}: Cannot assign ${valueType(evaluated.value)} to ${target.type} array '${target.arrayName}'.`,
      )
    } else {
      state.errors.push(
        `Line ${statement.line}: Cannot assign ${valueType(evaluated.value)} to ${target.type} variable '${target.name}'.`,
      )
    }
    return
  }

  target.setValue(evaluated.value)
}

function executeOutput(statement: Extract<Statement, { kind: 'output' }>, state: RuntimeState): void {
  const values: RuntimeValue[] = []

  for (const expression of statement.expressions) {
    const evaluated = evaluateExpression(expression, state.variables)
    if (!evaluated.ok) {
      state.errors.push(evaluated.error)
      return
    }

    values.push(evaluated.value)
  }

  state.output.push(values.map(formatValue).join(''))
}

function executeIf(statement: Extract<Statement, { kind: 'if' }>, state: RuntimeState): void {
  const condition = evaluateExpression(statement.condition, state.variables)

  if (!condition.ok) {
    state.errors.push(condition.error)
    return
  }

  if (typeof condition.value !== 'boolean') {
    state.errors.push(`Line ${statement.line}: IF condition must be BOOLEAN.`)
    return
  }

  executeStatements(condition.value ? statement.thenBranch : (statement.elseBranch ?? []), state)
}

function executeFor(statement: Extract<Statement, { kind: 'for' }>, state: RuntimeState): void {
  const counter = state.variables.get(statement.counter)

  if (!counter) {
    state.errors.push(`Line ${statement.line}: Variable '${statement.counter}' has not been declared.`)
    return
  }

  if (counter.kind !== 'scalar' || counter.type !== 'INTEGER') {
    state.errors.push(`Line ${statement.line}: FOR counter variable '${statement.counter}' must be INTEGER.`)
    return
  }

  const start = evaluateExpression(statement.start, state.variables)
  if (!start.ok) {
    state.errors.push(start.error)
    return
  }

  if (!isIntegerValue(start.value)) {
    state.errors.push(`Line ${statement.line}: FOR start value must be INTEGER.`)
    return
  }

  const end = evaluateExpression(statement.end, state.variables)
  if (!end.ok) {
    state.errors.push(end.error)
    return
  }

  if (!isIntegerValue(end.value)) {
    state.errors.push(`Line ${statement.line}: FOR end value must be INTEGER.`)
    return
  }

  const step = statement.step ? evaluateExpression(statement.step, state.variables) : ({ ok: true, value: 1 } as const)
  if (!step.ok) {
    state.errors.push(step.error)
    return
  }

  if (!isIntegerValue(step.value)) {
    state.errors.push(`Line ${statement.line}: FOR step value must be INTEGER.`)
    return
  }

  if (step.value === 0) {
    state.errors.push(`Line ${statement.line}: FOR step cannot be 0.`)
    return
  }

  counter.value = start.value

  while (step.value > 0 ? counter.value <= end.value : counter.value >= end.value) {
    if (!consumeExecutionStep(statement.line, state)) return

    executeStatements(statement.body, state)
    if (state.errors.length > 0) return

    counter.value += step.value
  }
}

function executeWhile(statement: Extract<Statement, { kind: 'while' }>, state: RuntimeState): void {
  while (true) {
    if (!consumeExecutionStep(statement.line, state)) return

    const condition = evaluateExpression(statement.condition, state.variables)
    if (!condition.ok) {
      state.errors.push(condition.error)
      return
    }

    if (typeof condition.value !== 'boolean') {
      state.errors.push(`Line ${statement.line}: WHILE condition must be BOOLEAN.`)
      return
    }

    if (!condition.value) return

    if (!hasExecutionStepsRemaining(statement.line, state)) return

    executeStatements(statement.body, state)
    if (state.errors.length > 0) return
  }
}

function executeRepeat(statement: Extract<Statement, { kind: 'repeat' }>, state: RuntimeState): void {
  while (true) {
    if (!hasExecutionStepsRemaining(statement.line, state)) return

    executeStatements(statement.body, state)
    if (state.errors.length > 0) return

    if (!consumeExecutionStep(statement.line, state)) return

    const condition = evaluateExpression(statement.untilCondition, state.variables)
    if (!condition.ok) {
      state.errors.push(condition.error)
      return
    }

    if (typeof condition.value !== 'boolean') {
      state.errors.push(`Line ${statement.untilLine}: UNTIL condition must be BOOLEAN.`)
      return
    }

    if (condition.value) return
  }
}

function resolveTarget(target: AssignmentTarget, variables: Map<string, StoredVariable>): TargetResult {
  const variable = variables.get(target.name)

  if (!variable) {
    return { ok: false, error: `Line ${target.line}: Variable '${target.name}' has not been declared.` }
  }

  if (target.kind === 'variable') {
    if (variable.kind === 'array') {
      return { ok: false, error: `Line ${target.line}: Cannot use array '${target.name}' without an index.` }
    }

    return {
      ok: true,
      name: target.name,
      type: variable.type,
      value: variable.value,
      setValue: (value) => {
        variable.value = value
      },
    }
  }

  if (variable.kind !== 'array') {
    return { ok: false, error: `Line ${target.line}: Variable '${target.name}' is not an array.` }
  }

  const index = evaluateIndex(target.index, variables)
  if (!index.ok) return index

  const bounds = checkArrayBounds(target.name, variable, index.value, target.line)
  if (!bounds.ok) return bounds

  return {
    ok: true,
    name: `${target.name}[${index.value}]`,
    type: variable.elementType,
    value: variable.values.get(index.value)!,
    arrayName: target.name,
    setValue: (value) => {
      variable.values.set(index.value, value)
    },
  }
}

function evaluateExpression(expression: Expression, variables: Map<string, StoredVariable>): EvaluationResult {
  if (expression.kind === 'literal') {
    return { ok: true, value: expression.value }
  }

  if (expression.kind === 'variable') {
    const variable = variables.get(expression.name)

    if (!variable) {
      return { ok: false, error: `Line ${expression.line}: Variable '${expression.name}' has not been declared.` }
    }

    if (variable.kind === 'array') {
      return { ok: false, error: `Line ${expression.line}: Cannot use array '${expression.name}' without an index.` }
    }

    return { ok: true, value: variable.value }
  }

  if (expression.kind === 'arrayAccess') {
    const variable = variables.get(expression.name)

    if (!variable) {
      return { ok: false, error: `Line ${expression.line}: Variable '${expression.name}' has not been declared.` }
    }

    if (variable.kind !== 'array') {
      return { ok: false, error: `Line ${expression.line}: Variable '${expression.name}' is not an array.` }
    }

    const index = evaluateIndex(expression.index, variables)
    if (!index.ok) return index

    const bounds = checkArrayBounds(expression.name, variable, index.value, expression.line)
    if (!bounds.ok) return bounds

    return { ok: true, value: variable.values.get(index.value)! }
  }

  if (expression.kind === 'unary') {
    const value = evaluateExpression(expression.expression, variables)
    if (!value.ok) return value

    if (expression.operator === '-') {
      if (typeof value.value === 'number') return { ok: true, value: -value.value }
      return { ok: false, error: `Line ${expression.line}: Operator '-' cannot be used with ${valueType(value.value)}.` }
    }

    if (typeof value.value !== 'boolean') {
      return { ok: false, error: `Line ${expression.line}: Operator 'NOT' cannot be used with ${valueType(value.value)}.` }
    }

    return { ok: true, value: !value.value }
  }

  const left = evaluateExpression(expression.left, variables)
  if (!left.ok) return left

  const right = evaluateExpression(expression.right, variables)
  if (!right.ok) return right

  if (expression.operator === '+') {
    if (typeof left.value === 'string' || typeof right.value === 'string') {
      return { ok: true, value: `${formatValue(left.value)}${formatValue(right.value)}` }
    }

    if (typeof left.value === 'number' && typeof right.value === 'number') {
      return { ok: true, value: left.value + right.value }
    }
  }

  if (expression.operator === '-' || expression.operator === '*' || expression.operator === '/') {
    if (typeof left.value === 'number' && typeof right.value === 'number') {
      if (expression.operator === '-') return { ok: true, value: left.value - right.value }
      if (expression.operator === '*') return { ok: true, value: left.value * right.value }
      if (right.value === 0) return { ok: false, error: `Line ${expression.line}: Division by zero.` }
      return { ok: true, value: left.value / right.value }
    }
  }

  if (expression.operator === 'DIV' || expression.operator === 'MOD') {
    if (isIntegerValue(left.value) && isIntegerValue(right.value)) {
      if (right.value === 0) return { ok: false, error: `Line ${expression.line}: Division by zero.` }
      if (expression.operator === 'DIV') return { ok: true, value: Math.trunc(left.value / right.value) }
      return { ok: true, value: left.value % right.value }
    }
  }

  if (isComparisonOperator(expression.operator)) {
    return compareValues(left.value, right.value, expression.operator, expression.line)
  }

  if (expression.operator === 'AND' || expression.operator === 'OR') {
    if (typeof left.value === 'boolean' && typeof right.value === 'boolean') {
      return { ok: true, value: expression.operator === 'AND' ? left.value && right.value : left.value || right.value }
    }
  }

  return {
    ok: false,
    error: `Line ${expression.line}: Operator '${expression.operator}' cannot be used with ${valueType(
      left.value,
    )} and ${valueType(right.value)}.`,
  }
}

function evaluateIndex(expression: Expression, variables: Map<string, StoredVariable>): { ok: true; value: number } | { ok: false; error: string } {
  const index = evaluateExpression(expression, variables)
  if (!index.ok) return index

  if (!isIntegerValue(index.value)) {
    return { ok: false, error: `Line ${expression.line}: Array index must be INTEGER.` }
  }

  return { ok: true, value: index.value }
}

function checkArrayBounds(
  name: string,
  variable: ArrayVariable,
  index: number,
  line: number,
): { ok: true } | { ok: false; error: string } {
  if (index < variable.lowerBound || index > variable.upperBound) {
    return {
      ok: false,
      error: `Line ${line}: Array index ${index} out of bounds for '${name}'. Valid range is ${variable.lowerBound} to ${variable.upperBound}.`,
    }
  }

  return { ok: true }
}

function compareValues(
  left: RuntimeValue,
  right: RuntimeValue,
  operator: '=' | '<>' | '<' | '<=' | '>' | '>=',
  line: number,
): EvaluationResult {
  if (operator === '=') return { ok: true, value: left === right }
  if (operator === '<>') return { ok: true, value: left !== right }

  if (typeof left === 'number' && typeof right === 'number') {
    if (operator === '<') return { ok: true, value: left < right }
    if (operator === '<=') return { ok: true, value: left <= right }
    if (operator === '>') return { ok: true, value: left > right }
    return { ok: true, value: left >= right }
  }

  return { ok: false, error: `Line ${line}: Operator '${operator}' cannot be used with ${valueType(left)} and ${valueType(right)}.` }
}

function consumeExecutionStep(line: number, state: RuntimeState): boolean {
  state.steps += 1

  if (state.steps > maxExecutionSteps) {
    state.errors.push(`Line ${line}: Execution limit exceeded. Possible infinite loop.`)
    return false
  }

  return true
}

function hasExecutionStepsRemaining(line: number, state: RuntimeState): boolean {
  if (state.steps >= maxExecutionSteps) {
    state.errors.push(`Line ${line}: Execution limit exceeded. Possible infinite loop.`)
    return false
  }

  return true
}

function convertInput(rawInput: string, type: VariableType, line: number): EvaluationResult {
  const text = rawInput.trim()

  if (type === 'STRING') return { ok: true, value: rawInput }

  if (type === 'INTEGER') {
    const value = Number(text)
    if (text !== '' && Number.isInteger(value)) return { ok: true, value }
    return { ok: false, error: `Line ${line}: Cannot convert input '${rawInput}' to INTEGER.` }
  }

  if (type === 'REAL') {
    const value = Number(text)
    if (text !== '' && Number.isFinite(value)) return { ok: true, value }
    return { ok: false, error: `Line ${line}: Cannot convert input '${rawInput}' to REAL.` }
  }

  if (text.toUpperCase() === 'TRUE') return { ok: true, value: true }
  if (text.toUpperCase() === 'FALSE') return { ok: true, value: false }

  return { ok: false, error: `Line ${line}: Cannot convert input '${rawInput}' to BOOLEAN.` }
}

function defaultValue(type: VariableType): RuntimeValue {
  if (type === 'STRING') return ''
  if (type === 'BOOLEAN') return false
  return 0
}

function canAssign(type: VariableType, value: RuntimeValue): boolean {
  if (type === 'INTEGER') return typeof value === 'number' && Number.isInteger(value)
  if (type === 'REAL') return typeof value === 'number'
  if (type === 'STRING') return typeof value === 'string'
  return typeof value === 'boolean'
}

function isComparisonOperator(operator: string): operator is '=' | '<>' | '<' | '<=' | '>' | '>=' {
  return operator === '=' || operator === '<>' || operator === '<' || operator === '<=' || operator === '>' || operator === '>='
}

function isIntegerValue(value: RuntimeValue): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function valueType(value: RuntimeValue): VariableType {
  if (typeof value === 'string') return 'STRING'
  if (typeof value === 'boolean') return 'BOOLEAN'
  return Number.isInteger(value) ? 'INTEGER' : 'REAL'
}

function formatValue(value: RuntimeValue): string {
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  return String(value)
}

function toPublicVariables(variables: Map<string, StoredVariable>): Record<string, unknown> {
  return Object.fromEntries(
    [...variables.entries()].map(([name, variable]) => {
      if (variable.kind === 'scalar') return [name, variable.value]

      return [
        name,
        Object.fromEntries(
          [...variable.values.entries()].map(([index, value]) => [String(index), value]),
        ),
      ]
    }),
  )
}
