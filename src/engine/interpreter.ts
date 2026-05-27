import type { Expression, RuntimeValue, RunResult, Statement, VariableType } from './types'

type StoredVariable = {
  type: VariableType
  value: RuntimeValue
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

export function interpret(statements: Statement[], inputText = '', initialErrors: string[] = []): RunResult {
  const output: string[] = []
  const errors = [...initialErrors]
  const variables = new Map<string, StoredVariable>()
  const inputLines = inputText.replace(/\r\n/g, '\n').split('\n')
  let inputIndex = 0

  if (errors.length > 0) {
    return { output, errors, variables: toPublicVariables(variables) }
  }

  for (const statement of statements) {
    if (statement.kind === 'declare') {
      if (variables.has(statement.name)) {
        errors.push(`Line ${statement.line}: Variable '${statement.name}' has already been declared.`)
        break
      }

      variables.set(statement.name, {
        type: statement.variableType,
        value: defaultValue(statement.variableType),
      })
      continue
    }

    if (statement.kind === 'input') {
      const target = variables.get(statement.name)

      if (!target) {
        errors.push(`Line ${statement.line}: Variable '${statement.name}' has not been declared.`)
        break
      }

      if (inputIndex >= inputLines.length || (inputLines.length === 1 && inputLines[0] === '')) {
        errors.push(`Line ${statement.line}: Not enough input values.`)
        break
      }

      const rawInput = inputLines[inputIndex]
      inputIndex += 1
      const converted = convertInput(rawInput, target.type, statement.line)

      if (!converted.ok) {
        errors.push(converted.error)
        break
      }

      target.value = converted.value
      continue
    }

    if (statement.kind === 'assign') {
      const target = variables.get(statement.name)

      if (!target) {
        errors.push(`Line ${statement.line}: Variable '${statement.name}' has not been declared.`)
        break
      }

      const evaluated = evaluateExpression(statement.expression, variables)
      if (!evaluated.ok) {
        errors.push(evaluated.error)
        break
      }

      if (!canAssign(target.type, evaluated.value)) {
        errors.push(
          `Line ${statement.line}: Cannot assign ${valueType(evaluated.value)} to ${target.type} variable '${statement.name}'.`,
        )
        break
      }

      target.value = evaluated.value
      continue
    }

    const values: RuntimeValue[] = []

    for (const expression of statement.expressions) {
      const evaluated = evaluateExpression(expression, variables)
      if (!evaluated.ok) {
        errors.push(evaluated.error)
        break
      }

      values.push(evaluated.value)
    }

    if (values.length === statement.expressions.length) {
      output.push(values.map(formatValue).join(''))
    } else {
      break
    }
  }

  return { output, errors, variables: toPublicVariables(variables) }
}

function evaluateExpression(expression: Expression, variables: Map<string, StoredVariable>): EvaluationResult {
  if (expression.kind === 'literal') {
    return { ok: true, value: expression.value }
  }

  if (expression.kind === 'variable') {
    const variable = variables.get(expression.name)

    if (!variable) {
      return {
        ok: false,
        error: `Line ${expression.line}: Variable '${expression.name}' has not been declared.`,
      }
    }

    return { ok: true, value: variable.value }
  }

  if (expression.kind === 'unary') {
    const value = evaluateExpression(expression.expression, variables)
    if (!value.ok) {
      return value
    }

    if (typeof value.value !== 'boolean') {
      return {
        ok: false,
        error: `Line ${expression.line}: Operator 'NOT' cannot be used with ${valueType(value.value)}.`,
      }
    }

    return { ok: true, value: !value.value }
  }

  const left = evaluateExpression(expression.left, variables)
  if (!left.ok) {
    return left
  }

  const right = evaluateExpression(expression.right, variables)
  if (!right.ok) {
    return right
  }

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
      if (expression.operator === '-') {
        return { ok: true, value: left.value - right.value }
      }

      if (expression.operator === '*') {
        return { ok: true, value: left.value * right.value }
      }

      if (right.value === 0) {
        return { ok: false, error: `Line ${expression.line}: Division by zero.` }
      }

      return { ok: true, value: left.value / right.value }
    }
  }

  if (expression.operator === 'DIV' || expression.operator === 'MOD') {
    if (
      typeof left.value === 'number' &&
      typeof right.value === 'number' &&
      Number.isInteger(left.value) &&
      Number.isInteger(right.value)
    ) {
      if (right.value === 0) {
        return { ok: false, error: `Line ${expression.line}: Division by zero.` }
      }

      if (expression.operator === 'DIV') {
        return { ok: true, value: Math.trunc(left.value / right.value) }
      }

      return { ok: true, value: left.value % right.value }
    }
  }

  if (isComparisonOperator(expression.operator)) {
    return compareValues(left.value, right.value, expression.operator, expression.line)
  }

  if (expression.operator === 'AND' || expression.operator === 'OR') {
    if (typeof left.value === 'boolean' && typeof right.value === 'boolean') {
      return {
        ok: true,
        value: expression.operator === 'AND' ? left.value && right.value : left.value || right.value,
      }
    }
  }

  return {
    ok: false,
    error: `Line ${expression.line}: Operator '${expression.operator}' cannot be used with ${valueType(
      left.value,
    )} and ${valueType(right.value)}.`,
  }
}

function compareValues(
  left: RuntimeValue,
  right: RuntimeValue,
  operator: '=' | '<>' | '<' | '<=' | '>' | '>=',
  line: number,
): EvaluationResult {
  if (operator === '=') {
    return { ok: true, value: left === right }
  }

  if (operator === '<>') {
    return { ok: true, value: left !== right }
  }

  if (typeof left === 'number' && typeof right === 'number') {
    if (operator === '<') {
      return { ok: true, value: left < right }
    }

    if (operator === '<=') {
      return { ok: true, value: left <= right }
    }

    if (operator === '>') {
      return { ok: true, value: left > right }
    }

    return { ok: true, value: left >= right }
  }

  return {
    ok: false,
    error: `Line ${line}: Operator '${operator}' cannot be used with ${valueType(left)} and ${valueType(right)}.`,
  }
}

function convertInput(rawInput: string, type: VariableType, line: number): EvaluationResult {
  const text = rawInput.trim()

  if (type === 'STRING') {
    return { ok: true, value: rawInput }
  }

  if (type === 'INTEGER') {
    const value = Number(text)
    if (text !== '' && Number.isInteger(value)) {
      return { ok: true, value }
    }

    return { ok: false, error: `Line ${line}: Cannot convert input '${rawInput}' to INTEGER.` }
  }

  if (type === 'REAL') {
    const value = Number(text)
    if (text !== '' && Number.isFinite(value)) {
      return { ok: true, value }
    }

    return { ok: false, error: `Line ${line}: Cannot convert input '${rawInput}' to REAL.` }
  }

  if (text.toUpperCase() === 'TRUE') {
    return { ok: true, value: true }
  }

  if (text.toUpperCase() === 'FALSE') {
    return { ok: true, value: false }
  }

  return { ok: false, error: `Line ${line}: Cannot convert input '${rawInput}' to BOOLEAN.` }
}

function defaultValue(type: VariableType): RuntimeValue {
  if (type === 'STRING') {
    return ''
  }

  if (type === 'BOOLEAN') {
    return false
  }

  return 0
}

function canAssign(type: VariableType, value: RuntimeValue): boolean {
  if (type === 'INTEGER') {
    return typeof value === 'number' && Number.isInteger(value)
  }

  if (type === 'REAL') {
    return typeof value === 'number'
  }

  if (type === 'STRING') {
    return typeof value === 'string'
  }

  return typeof value === 'boolean'
}

function isComparisonOperator(operator: string): operator is '=' | '<>' | '<' | '<=' | '>' | '>=' {
  return operator === '=' || operator === '<>' || operator === '<' || operator === '<=' || operator === '>' || operator === '>='
}

function valueType(value: RuntimeValue): VariableType {
  if (typeof value === 'string') {
    return 'STRING'
  }

  if (typeof value === 'boolean') {
    return 'BOOLEAN'
  }

  return Number.isInteger(value) ? 'INTEGER' : 'REAL'
}

function formatValue(value: RuntimeValue): string {
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }

  return String(value)
}

function toPublicVariables(variables: Map<string, StoredVariable>): Record<string, unknown> {
  return Object.fromEntries([...variables.entries()].map(([name, variable]) => [name, variable.value]))
}
