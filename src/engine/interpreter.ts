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

export function interpret(statements: Statement[], initialErrors: string[] = []): RunResult {
  const output: string[] = []
  const errors = [...initialErrors]
  const variables = new Map<string, StoredVariable>()

  if (errors.length > 0) {
    return { output, errors, variables: toPublicVariables(variables) }
  }

  for (const statement of statements) {
    if (statement.kind === 'declare') {
      if (variables.has(statement.name)) {
        errors.push(`Line ${statement.line}: Variable '${statement.name}' has already been declared.`)
        continue
      }

      variables.set(statement.name, {
        type: statement.variableType,
        value: defaultValue(statement.variableType),
      })
      continue
    }

    if (statement.kind === 'assign') {
      const target = variables.get(statement.name)

      if (!target) {
        errors.push(`Line ${statement.line}: Variable '${statement.name}' has not been declared.`)
        continue
      }

      const evaluated = evaluateExpression(statement.expression, variables)
      if (!evaluated.ok) {
        errors.push(evaluated.error)
        continue
      }

      if (!canAssign(target.type, evaluated.value)) {
        errors.push(
          `Line ${statement.line}: Cannot assign ${valueType(evaluated.value)} to ${target.type} variable '${statement.name}'.`,
        )
        continue
      }

      target.value = evaluated.value
      continue
    }

    const evaluated = evaluateExpression(statement.expression, variables)
    if (!evaluated.ok) {
      errors.push(evaluated.error)
      continue
    }

    output.push(formatValue(evaluated.value))
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

  if (
    (expression.operator === '-' || expression.operator === '*' || expression.operator === '/') &&
    typeof left.value === 'number' &&
    typeof right.value === 'number'
  ) {
    if (expression.operator === '-') {
      return { ok: true, value: left.value - right.value }
    }

    if (expression.operator === '*') {
      return { ok: true, value: left.value * right.value }
    }

    return { ok: true, value: left.value / right.value }
  }

  return {
    ok: false,
    error: `Line ${expression.line}: Operator '${expression.operator}' cannot be used with ${valueType(
      left.value,
    )} and ${valueType(right.value)}.`,
  }
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
