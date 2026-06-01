import type { AssignmentTarget, CaseLabel, DataType, Expression, RuntimeValue, RunResult, Statement, VariableType } from './types'

const maxExecutionSteps = 100000
const maxProcedureCallDepth = 100

type ScalarVariable = {
  kind: 'scalar'
  type: VariableType
  value: RuntimeValue
}

type RecordFieldValue = {
  name: string
  type: VariableType
  value: RuntimeValue
}

type RecordValue = {
  typeName: string
  fields: Map<string, RecordFieldValue>
}

type RecordVariable = {
  kind: 'record'
  typeName: string
  value: RecordValue
}

type ArrayVariable = {
  kind: 'array'
  elementType: DataType
  bounds: Array<{
    lower: number
    upper: number
  }>
  values: Map<string, RuntimeValue | RecordValue>
}

type StoredVariable = ScalarVariable | ArrayVariable | RecordVariable
type ProcedureDefinition = Extract<Statement, { kind: 'procedure' }>
type FunctionDefinition = Extract<Statement, { kind: 'function' }>
type TypeDefinition = Extract<Statement, { kind: 'typeDefinition' }>
type FileMode = 'READ' | 'WRITE' | 'APPEND'

type VirtualFile = {
  mode: FileMode | null
  lines: string[]
  pointer: number
}

type RuntimeState = {
  output: string[]
  errors: string[]
  variables: Map<string, StoredVariable>
  localScopes: Array<Map<string, ScalarVariable>>
  procedures: Map<string, ProcedureDefinition>
  functions: Map<string, FunctionDefinition>
  types: Map<string, TypeDefinition>
  files: Map<string, VirtualFile>
  inputLines: string[]
  inputIndex: number
  steps: number
  callDepth: number
  functionDepth: number
  functionReturn?: {
    value: RuntimeValue
    line: number
  }
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
      fieldName?: string
      recordName?: string
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
    localScopes: [],
    procedures: new Map<string, ProcedureDefinition>(),
    functions: new Map<string, FunctionDefinition>(),
    types: new Map<string, TypeDefinition>(),
    files: new Map<string, VirtualFile>(),
    inputLines: inputText.replace(/\r\n/g, '\n').split('\n'),
    inputIndex: 0,
    steps: 0,
    callDepth: 0,
    functionDepth: 0,
  }

  if (state.errors.length === 0) {
    collectTypeDefinitions(statements, state)
  }

  if (state.errors.length === 0) {
    collectCallableDefinitions(statements, state)
  }

  if (state.errors.length === 0) {
    executeStatements(statements, state)
  }

  return {
    output: state.output,
    errors: state.errors,
    variables: toPublicVariables(state.variables),
    files: toPublicFiles(state.files),
  }
}

function executeStatements(statements: Statement[], state: RuntimeState): void {
  for (const statement of statements) {
    executeStatement(statement, state)

    if (state.functionReturn) return
    if (state.errors.length > 0) return
  }
}

function executeStatement(statement: Statement, state: RuntimeState): void {
  if (statement.kind === 'procedure') return
  if (statement.kind === 'function') return
  if (statement.kind === 'typeDefinition') return

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

  if (statement.kind === 'case') {
    executeCase(statement, state)
    return
  }

  if (statement.kind === 'call') {
    executeCall(statement, state)
    return
  }

  if (statement.kind === 'return') {
    executeReturn(statement, state)
    return
  }

  if (statement.kind === 'openFile') {
    executeOpenFile(statement, state)
    return
  }

  if (statement.kind === 'readFile') {
    executeReadFile(statement, state)
    return
  }

  if (statement.kind === 'writeFile') {
    executeWriteFile(statement, state)
    return
  }

  if (statement.kind === 'closeFile') {
    executeCloseFile(statement, state)
    return
  }

  executeFor(statement, state)
}

function collectTypeDefinitions(statements: Statement[], state: RuntimeState): void {
  for (const statement of statements) {
    if (statement.kind !== 'typeDefinition') continue

    const key = normalizeTypeName(statement.name)
    if (state.types.has(key)) {
      state.errors.push(`Line ${statement.line}: Type '${statement.name}' has already been declared.`)
      return
    }

    state.types.set(key, statement)
  }
}

function collectCallableDefinitions(statements: Statement[], state: RuntimeState): void {
  for (const statement of statements) {
    if (statement.kind === 'procedure') {
      const key = normalizeCallableName(statement.name)
      if (state.procedures.has(key)) {
        state.errors.push(`Line ${statement.line}: Procedure '${statement.name}' has already been declared.`)
        return
      }
      if (state.functions.has(key)) {
        state.errors.push(`Line ${statement.line}: Name '${statement.name}' is already used by a function.`)
        return
      }
      state.procedures.set(key, statement)
    }

    if (statement.kind === 'function') {
      const key = normalizeCallableName(statement.name)
      if (state.functions.has(key)) {
        state.errors.push(`Line ${statement.line}: Function '${statement.name}' has already been declared.`)
        return
      }
      if (state.procedures.has(key)) {
        state.errors.push(`Line ${statement.line}: Name '${statement.name}' is already used by a procedure.`)
        return
      }
      state.functions.set(key, statement)
    }
  }
}

function executeScalarDeclaration(statement: Extract<Statement, { kind: 'declare' }>, state: RuntimeState): void {
  if (findLocalVariable(statement.name, state)) {
    state.errors.push(`Line ${statement.line}: Variable '${statement.name}' has already been declared.`)
    return
  }

  if (findGlobalVariable(statement.name, state)) {
    state.errors.push(`Line ${statement.line}: Variable '${statement.name}' has already been declared.`)
    return
  }

  if (isScalarType(statement.variableType)) {
    state.variables.set(statement.name, {
      kind: 'scalar',
      type: statement.variableType,
      value: defaultValue(statement.variableType),
    })
    return
  }

  const typeDefinition = state.types.get(normalizeTypeName(statement.variableType))
  if (!typeDefinition) {
    state.errors.push(`Line ${statement.line}: Unknown data type '${statement.variableType}'.`)
    return
  }

  state.variables.set(statement.name, {
    kind: 'record',
    typeName: typeDefinition.name,
    value: createRecordValue(typeDefinition),
  })
}

function executeArrayDeclaration(statement: Extract<Statement, { kind: 'declareArray' }>, state: RuntimeState): void {
  if (findGlobalVariable(statement.name, state)) {
    state.errors.push(`Line ${statement.line}: Variable '${statement.name}' has already been declared.`)
    return
  }

  if (!isScalarType(statement.elementType) && statement.bounds.length !== 1) {
    state.errors.push(`Line ${statement.line}: Two-dimensional arrays of records are not supported yet.`)
    return
  }

  const recordType = isScalarType(statement.elementType) ? undefined : state.types.get(normalizeTypeName(statement.elementType))
  if (!isScalarType(statement.elementType) && !recordType) {
    state.errors.push(`Line ${statement.line}: Unknown data type '${statement.elementType}'.`)
    return
  }

  const values = new Map<string, RuntimeValue | RecordValue>()

  if (statement.bounds.length === 1) {
    const [bound] = statement.bounds
    for (let index = bound.lower; index <= bound.upper; index += 1) {
      values.set(String(index), recordType ? createRecordValue(recordType) : defaultValue(statement.elementType as VariableType))
    }
  } else {
    const [rowBound, columnBound] = statement.bounds
    for (let row = rowBound.lower; row <= rowBound.upper; row += 1) {
      for (let column = columnBound.lower; column <= columnBound.upper; column += 1) {
        values.set(arrayKey([row, column]), defaultValue(statement.elementType as VariableType))
      }
    }
  }

  state.variables.set(statement.name, {
    kind: 'array',
    elementType: statement.elementType,
    bounds: statement.bounds,
    values,
  })
}

function executeInput(statement: Extract<Statement, { kind: 'input' }>, state: RuntimeState): void {
  const target = resolveTarget(statement.target, state)

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
  const recordAssignment = tryRecordAssignment(statement, state)
  if (recordAssignment.handled) return

  const target = resolveTarget(statement.target, state)

  if (!target.ok) {
    state.errors.push(target.error)
    return
  }

  const evaluated = evaluateExpression(statement.expression, state)
  if (!evaluated.ok) {
    state.errors.push(evaluated.error)
    return
  }

  if (!canAssign(target.type, evaluated.value)) {
    state.errors.push(formatAssignmentError(statement.line, target, evaluated.value))
    return
  }

  target.setValue(evaluated.value)
}

function executeOutput(statement: Extract<Statement, { kind: 'output' }>, state: RuntimeState): void {
  const values: RuntimeValue[] = []

  for (const expression of statement.expressions) {
    const evaluated = evaluateExpression(expression, state)
    if (!evaluated.ok) {
      state.errors.push(evaluated.error)
      return
    }

    values.push(evaluated.value)
  }

  state.output.push(values.map(formatValue).join(''))
}

function formatAssignmentError(line: number, target: Extract<TargetResult, { ok: true }>, value: RuntimeValue): string {
  if (target.type === 'CHAR' && typeof value === 'string') {
    return `Line ${line}: CHAR value must contain exactly one character.`
  }

  if (target.fieldName && target.recordName) {
    return `Line ${line}: Cannot assign ${valueType(value)} to ${target.type} field '${target.fieldName}' of record '${target.recordName}'.`
  }

  if (target.arrayName) {
    return `Line ${line}: Cannot assign ${valueType(value)} to ${target.type} array '${target.arrayName}'.`
  }

  return `Line ${line}: Cannot assign ${valueType(value)} to ${target.type} variable '${target.name}'.`
}

function executeOpenFile(statement: Extract<Statement, { kind: 'openFile' }>, state: RuntimeState): void {
  if (statement.mode !== 'READ' && statement.mode !== 'WRITE' && statement.mode !== 'APPEND') {
    state.errors.push(`Line ${statement.line}: Invalid file mode '${statement.mode}'.`)
    return
  }

  const file = getOrCreateFile(statement.fileName, state)
  if (file.mode !== null) {
    state.errors.push(`Line ${statement.line}: File '${statement.fileName}' is already open.`)
    return
  }

  file.mode = statement.mode
  if (statement.mode === 'READ') {
    file.pointer = 0
  } else if (statement.mode === 'WRITE') {
    file.lines = []
    file.pointer = 0
  } else {
    file.pointer = file.lines.length
  }
}

function executeWriteFile(statement: Extract<Statement, { kind: 'writeFile' }>, state: RuntimeState): void {
  const file = state.files.get(statement.fileName)
  if (!file || file.mode === null) {
    state.errors.push(`Line ${statement.line}: File '${statement.fileName}' is not open.`)
    return
  }

  if (file.mode !== 'WRITE' && file.mode !== 'APPEND') {
    state.errors.push(`Line ${statement.line}: File '${statement.fileName}' is not open for writing.`)
    return
  }

  const evaluated = evaluateExpression(statement.expression, state)
  if (!evaluated.ok) {
    state.errors.push(evaluated.error)
    return
  }

  file.lines.push(formatValue(evaluated.value))
  file.pointer = file.lines.length
}

function executeReadFile(statement: Extract<Statement, { kind: 'readFile' }>, state: RuntimeState): void {
  const file = state.files.get(statement.fileName)
  if (!file || file.mode === null) {
    state.errors.push(`Line ${statement.line}: File '${statement.fileName}' is not open.`)
    return
  }

  if (file.mode !== 'READ') {
    state.errors.push(`Line ${statement.line}: File '${statement.fileName}' is not open for reading.`)
    return
  }

  if (file.pointer >= file.lines.length) {
    state.errors.push(`Line ${statement.line}: End of file reached for '${statement.fileName}'.`)
    return
  }

  const target = resolveTarget(statement.target, state)
  if (!target.ok) {
    state.errors.push(target.error)
    return
  }

  const rawValue = file.lines[file.pointer]
  const converted = convertFileValue(rawValue, target.type, statement.line)
  if (!converted.ok) {
    state.errors.push(converted.error)
    return
  }

  file.pointer += 1
  target.setValue(converted.value)
}

function executeCloseFile(statement: Extract<Statement, { kind: 'closeFile' }>, state: RuntimeState): void {
  const file = state.files.get(statement.fileName)
  if (!file || file.mode === null) {
    state.errors.push(`Line ${statement.line}: File '${statement.fileName}' is not open.`)
    return
  }

  file.mode = null
}

function executeIf(statement: Extract<Statement, { kind: 'if' }>, state: RuntimeState): void {
  const condition = evaluateExpression(statement.condition, state)

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
  const resolvedCounter = findVariable(statement.counter, state)
  const counter = resolvedCounter?.variable

  if (!counter) {
    state.errors.push(`Line ${statement.line}: Variable '${statement.counter}' has not been declared.`)
    return
  }

  if (counter.kind !== 'scalar' || counter.type !== 'INTEGER') {
    state.errors.push(`Line ${statement.line}: FOR counter variable '${statement.counter}' must be INTEGER.`)
    return
  }

  const start = evaluateExpression(statement.start, state)
  if (!start.ok) {
    state.errors.push(start.error)
    return
  }

  if (!isIntegerValue(start.value)) {
    state.errors.push(`Line ${statement.line}: FOR start value must be INTEGER.`)
    return
  }

  const end = evaluateExpression(statement.end, state)
  if (!end.ok) {
    state.errors.push(end.error)
    return
  }

  if (!isIntegerValue(end.value)) {
    state.errors.push(`Line ${statement.line}: FOR end value must be INTEGER.`)
    return
  }

  const step = statement.step ? evaluateExpression(statement.step, state) : ({ ok: true, value: 1 } as const)
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
    if (state.functionReturn) return

    counter.value += step.value
  }
}

function executeWhile(statement: Extract<Statement, { kind: 'while' }>, state: RuntimeState): void {
  while (true) {
    if (!consumeExecutionStep(statement.line, state)) return

    const condition = evaluateExpression(statement.condition, state)
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
    if (state.functionReturn) return
  }
}

function executeRepeat(statement: Extract<Statement, { kind: 'repeat' }>, state: RuntimeState): void {
  while (true) {
    if (!hasExecutionStepsRemaining(statement.line, state)) return

    executeStatements(statement.body, state)
    if (state.errors.length > 0) return
    if (state.functionReturn) return

    if (!consumeExecutionStep(statement.line, state)) return

    const condition = evaluateExpression(statement.untilCondition, state)
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

function executeReturn(statement: Extract<Statement, { kind: 'return' }>, state: RuntimeState): void {
  if (state.functionDepth === 0) {
    state.errors.push(`Line ${statement.line}: RETURN outside FUNCTION.`)
    return
  }

  const evaluated = evaluateExpression(statement.expression, state)
  if (!evaluated.ok) {
    state.errors.push(evaluated.error)
    return
  }

  state.functionReturn = {
    value: evaluated.value,
    line: statement.line,
  }
}

function executeCase(statement: Extract<Statement, { kind: 'case' }>, state: RuntimeState): void {
  const selector = evaluateExpression(statement.expression, state)

  if (!selector.ok) {
    state.errors.push(selector.error)
    return
  }

  for (const branch of statement.branches) {
    const match = matchesCaseLabel(selector.value, branch.label)
    if (!match.ok) {
      state.errors.push(match.error)
      return
    }

    if (match.value) {
      executeStatements(branch.statements, state)
      return
    }
  }

  if (statement.otherwiseBranch) {
    executeStatements(statement.otherwiseBranch, state)
  }
}

function executeCall(statement: Extract<Statement, { kind: 'call' }>, state: RuntimeState): void {
  const procedure = state.procedures.get(normalizeCallableName(statement.name))

  if (!procedure) {
    state.errors.push(`Line ${statement.line}: Procedure '${statement.name}' has not been declared.`)
    return
  }

  if (statement.args.length !== procedure.parameters.length) {
    state.errors.push(
      `Line ${statement.line}: Procedure '${statement.name}' expects ${procedure.parameters.length} ${
        procedure.parameters.length === 1 ? 'argument' : 'arguments'
      } but got ${statement.args.length}.`,
    )
    return
  }

  const localScope = new Map<string, ScalarVariable>()

  for (let index = 0; index < procedure.parameters.length; index += 1) {
    const parameter = procedure.parameters[index]
    const argument = statement.args[index]

    if (parameter.mode === 'BYREF') {
      if (argument.kind !== 'variable') {
        state.errors.push(`Line ${statement.line}: BYREF argument ${index + 1} for procedure '${statement.name}' must be a variable.`)
        return
      }

      const resolved = findVariable(argument.name, state)
      const variable = resolved?.variable

      if (!variable) {
        state.errors.push(`Line ${statement.line}: Variable '${argument.name}' has not been declared.`)
        return
      }

      if (variable.kind !== 'scalar') {
        state.errors.push(`Line ${statement.line}: BYREF argument ${index + 1} for procedure '${statement.name}' must be a variable.`)
        return
      }

      if (variable.type !== parameter.type) {
        state.errors.push(
          `Line ${statement.line}: BYREF argument ${index + 1} for procedure '${statement.name}' must be ${parameter.type} but got ${variable.type}.`,
        )
        return
      }

      localScope.set(normalizeVariableName(parameter.name), variable)
      continue
    }

    const arg = evaluateExpression(argument, state)
    if (!arg.ok) {
      state.errors.push(arg.error)
      return
    }

    if (!canAssign(parameter.type, arg.value)) {
      state.errors.push(
        `Line ${statement.line}: Argument ${index + 1} for procedure '${statement.name}' must be ${parameter.type} but got ${valueType(
          arg.value,
        )}.`,
      )
      return
    }

    localScope.set(normalizeVariableName(parameter.name), {
      kind: 'scalar',
      type: parameter.type,
      value: arg.value,
    })
  }

  if (state.callDepth >= maxProcedureCallDepth) {
    state.errors.push(`Line ${statement.line}: Procedure call depth limit exceeded. Possible infinite recursion.`)
    return
  }

  state.callDepth += 1
  state.localScopes.push(localScope)
  executeStatements(procedure.body, state)
  state.localScopes.pop()
  state.callDepth -= 1
}

function normalizeCallableName(name: string): string {
  return name.toUpperCase()
}

function normalizeTypeName(name: string): string {
  return name.toUpperCase()
}

function normalizeVariableName(name: string): string {
  return name.toUpperCase()
}

function normalizeFieldName(name: string): string {
  return name.toUpperCase()
}

function findLocalVariable(name: string, state: RuntimeState): ScalarVariable | undefined {
  const key = normalizeVariableName(name)

  for (let index = state.localScopes.length - 1; index >= 0; index -= 1) {
    const variable = state.localScopes[index].get(key)
    if (variable) return variable
  }

  return undefined
}

function findVariable(name: string, state: RuntimeState): { variable: StoredVariable } | undefined {
  const local = findLocalVariable(name, state)
  if (local) return { variable: local }

  const global = findGlobalVariable(name, state)
  if (global) return { variable: global }

  return undefined
}

function findGlobalVariable(name: string, state: RuntimeState): StoredVariable | undefined {
  const key = normalizeVariableName(name)

  for (const [variableName, variable] of state.variables.entries()) {
    if (normalizeVariableName(variableName) === key) return variable
  }

  return undefined
}

function matchesCaseLabel(selector: RuntimeValue, label: CaseLabel): EvaluationResult {
  if (label.kind === 'literal') {
    const compatible = checkCaseLabelType(selector, label.value, label.line, 'CASE label type')
    if (!compatible.ok) return compatible
    return { ok: true, value: selector === label.value }
  }

  if (label.kind === 'comparison') {
    const compatible = checkCaseLabelType(selector, label.value.value, label.line, 'CASE label type')
    if (!compatible.ok) return compatible

    if (label.operator === '=') return { ok: true, value: selector === label.value.value }
    if (label.operator === '<>') return { ok: true, value: selector !== label.value.value }

    if (typeof selector === 'string') {
      return { ok: false, error: `Line ${label.line}: Operator '${label.operator}' is not supported for STRING CASE labels.` }
    }

    if (typeof selector === 'boolean') {
      return { ok: false, error: `Line ${label.line}: Operator '${label.operator}' is not supported for BOOLEAN CASE labels.` }
    }

    const labelValue = label.value.value
    if (typeof labelValue !== 'number') {
      return { ok: false, error: `Line ${label.line}: Operator '${label.operator}' is not supported for ${valueType(labelValue)} CASE labels.` }
    }

    if (label.operator === '<') return { ok: true, value: selector < labelValue }
    if (label.operator === '<=') return { ok: true, value: selector <= labelValue }
    if (label.operator === '>') return { ok: true, value: selector > labelValue }
    return { ok: true, value: selector >= labelValue }
  }

  if (typeof label.lower.value !== 'number' || typeof label.upper.value !== 'number') {
    return {
      ok: false,
      error: `Line ${label.line}: CASE range labels only support INTEGER and REAL values.`,
    }
  }

  const compatible = checkCaseLabelType(selector, label.lower.value, label.line, 'CASE range label type')
  if (!compatible.ok) return compatible

  if (label.lower.value > label.upper.value) {
    return { ok: false, error: `Line ${label.line}: CASE range lower bound cannot be greater than upper bound.` }
  }

  if (typeof selector !== 'number') {
    return {
      ok: false,
      error: `Line ${label.line}: CASE range label type ${valueType(label.lower.value)} does not match CASE expression type ${valueType(selector)}.`,
    }
  }

  return { ok: true, value: selector >= label.lower.value && selector <= label.upper.value }
}

function checkCaseLabelType(
  selector: RuntimeValue,
  labelValue: RuntimeValue,
  line: number,
  prefix: 'CASE label type' | 'CASE range label type',
): { ok: true } | { ok: false; error: string } {
  const selectorType = valueType(selector)
  const labelType = valueType(labelValue)

  if (selectorType === labelType || (typeof selector === 'number' && typeof labelValue === 'number')) {
    return { ok: true }
  }

  return { ok: false, error: `Line ${line}: ${prefix} ${labelType} does not match CASE expression type ${selectorType}.` }
}

function tryRecordAssignment(
  statement: Extract<Statement, { kind: 'assign' }>,
  state: RuntimeState,
): { handled: boolean } {
  if (statement.target.kind !== 'variable') return { handled: false }

  const target = findVariable(statement.target.name, state)?.variable
  if (!target || target.kind !== 'record') return { handled: false }

  const source = resolveRecordFromExpression(statement.expression, state)
  if (!source.ok) {
    state.errors.push(source.error)
    return { handled: true }
  }

  if (normalizeTypeName(target.typeName) !== normalizeTypeName(source.value.typeName)) {
    state.errors.push(
      `Line ${statement.line}: Cannot assign record type '${source.value.typeName}' to record type '${target.typeName}'.`,
    )
    return { handled: true }
  }

  target.value = cloneRecordValue(source.value)
  return { handled: true }
}

function resolveRecordFromTargetBase(
  target: Extract<AssignmentTarget, { kind: 'recordField' }>['record'],
  state: RuntimeState,
): { ok: true; name: string; value: RecordValue } | { ok: false; error: string } {
  if (target.kind === 'variable') {
    const variable = findVariable(target.name, state)?.variable
    if (!variable) return { ok: false, error: `Line ${target.line}: Variable '${target.name}' has not been declared.` }
    if (variable.kind !== 'record') return { ok: false, error: `Line ${target.line}: Variable '${target.name}' is not a record.` }
    return { ok: true, name: target.name, value: variable.value }
  }

  const variable = findVariable(target.name, state)?.variable
  if (!variable) return { ok: false, error: `Line ${target.line}: Variable '${target.name}' has not been declared.` }
  if (variable.kind !== 'array') return { ok: false, error: `Line ${target.line}: Variable '${target.name}' is not an array.` }

  const indices = evaluateIndices(target.indices, state)
  if (!indices.ok) return indices

  const bounds = checkArrayAccess(target.name, variable, indices.value, target.line)
  if (!bounds.ok) return bounds

  const value = variable.values.get(arrayKey(indices.value))!
  if (!isRecordValue(value)) return { ok: false, error: `Line ${target.line}: Variable '${target.name}' is not a record.` }

  return { ok: true, name: target.name, value }
}

function resolveRecordFromExpression(
  expression: Expression,
  state: RuntimeState,
): { ok: true; name: string; value: RecordValue } | { ok: false; error: string } {
  if (expression.kind === 'variable') {
    const variable = findVariable(expression.name, state)?.variable
    if (!variable) return { ok: false, error: `Line ${expression.line}: Variable '${expression.name}' has not been declared.` }
    if (variable.kind !== 'record') return { ok: false, error: `Line ${expression.line}: Variable '${expression.name}' is not a record.` }
    return { ok: true, name: expression.name, value: variable.value }
  }

  if (expression.kind === 'arrayAccess') {
    const variable = findVariable(expression.name, state)?.variable
    if (!variable) return { ok: false, error: `Line ${expression.line}: Variable '${expression.name}' has not been declared.` }
    if (variable.kind !== 'array') return { ok: false, error: `Line ${expression.line}: Variable '${expression.name}' is not an array.` }

    const indices = evaluateIndices(expression.indices, state)
    if (!indices.ok) return indices

    const bounds = checkArrayAccess(expression.name, variable, indices.value, expression.line)
    if (!bounds.ok) return bounds

    const value = variable.values.get(arrayKey(indices.value))!
    if (!isRecordValue(value)) return { ok: false, error: `Line ${expression.line}: Variable '${expression.name}' is not a record.` }

    return { ok: true, name: expression.name, value }
  }

  return { ok: false, error: `Line ${expression.line}: Invalid record expression.` }
}

function resolveTarget(target: AssignmentTarget, state: RuntimeState): TargetResult {
  if (target.kind === 'recordField') {
    const record = resolveRecordFromTargetBase(target.record, state)
    if (!record.ok) return record

    const field = record.value.fields.get(normalizeFieldName(target.fieldName))
    if (!field) {
      return { ok: false, error: `Line ${target.line}: Record '${record.name}' has no field '${target.fieldName}'.` }
    }

    return {
      ok: true,
      name: `${record.name}.${field.name}`,
      type: field.type,
      value: field.value,
      fieldName: field.name,
      recordName: record.name,
      setValue: (value) => {
        field.value = value
      },
    }
  }

  const resolved = findVariable(target.name, state)
  const variable = resolved?.variable

  if (!variable) {
    return { ok: false, error: `Line ${target.line}: Variable '${target.name}' has not been declared.` }
  }

  if (target.kind === 'variable') {
    if (variable.kind === 'array') {
      return { ok: false, error: `Line ${target.line}: Cannot use array '${target.name}' without an index.` }
    }

    if (variable.kind === 'record') {
      return { ok: false, error: `Line ${target.line}: Cannot use record '${target.name}' without a field.` }
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
    if (variable.kind === 'scalar' && variable.type === 'STRING') {
      return { ok: false, error: `Line ${target.line}: Cannot assign to a character inside a STRING.` }
    }

    return { ok: false, error: `Line ${target.line}: Variable '${target.name}' is not an array.` }
  }

  const indices = evaluateIndices(target.indices, state)
  if (!indices.ok) return indices

  const bounds = checkArrayAccess(target.name, variable, indices.value, target.line)
  if (!bounds.ok) return bounds
  const key = arrayKey(indices.value)
  const value = variable.values.get(key)!

  if (isRecordValue(value)) {
    return { ok: false, error: `Line ${target.line}: Cannot use record '${target.name}' without a field.` }
  }

  return {
    ok: true,
    name: `${target.name}[${indices.value.join(',')}]`,
    type: variable.elementType as VariableType,
    value,
    arrayName: target.name,
    setValue: (value) => {
      variable.values.set(key, value)
    },
  }
}

function evaluateExpression(expression: Expression, state: RuntimeState): EvaluationResult {
  if (expression.kind === 'literal') {
    return { ok: true, value: expression.value }
  }

  if (expression.kind === 'variable') {
    const resolved = findVariable(expression.name, state)
    const variable = resolved?.variable

    if (!variable) {
      return { ok: false, error: `Line ${expression.line}: Variable '${expression.name}' has not been declared.` }
    }

    if (variable.kind === 'array') {
      return { ok: false, error: `Line ${expression.line}: Cannot use array '${expression.name}' without an index.` }
    }

    if (variable.kind === 'record') {
      return { ok: false, error: `Line ${expression.line}: Cannot use record '${expression.name}' without a field.` }
    }

    return { ok: true, value: variable.value }
  }

  if (expression.kind === 'arrayAccess') {
    const resolved = findVariable(expression.name, state)
    const variable = resolved?.variable

    if (!variable) {
      return { ok: false, error: `Line ${expression.line}: Variable '${expression.name}' has not been declared.` }
    }

    if (variable.kind === 'scalar' && variable.type === 'STRING') {
      const indices = evaluateStringIndices(expression.indices, state)
      if (!indices.ok) return indices
      return resolveStringIndex(expression.name, variable.value, indices.value, expression.line)
    }

    if (variable.kind !== 'array') {
      return { ok: false, error: `Line ${expression.line}: Variable '${expression.name}' is not an array.` }
    }

    const indices = evaluateIndices(expression.indices, state)
    if (!indices.ok) return indices

    const bounds = checkArrayAccess(expression.name, variable, indices.value, expression.line)
    if (!bounds.ok) return bounds

    const value = variable.values.get(arrayKey(indices.value))!
    if (isRecordValue(value)) {
      return { ok: false, error: `Line ${expression.line}: Cannot use record '${expression.name}' without a field.` }
    }

    return { ok: true, value }
  }

  if (expression.kind === 'fieldAccess') {
    const record = resolveRecordFromExpression(expression.record, state)
    if (!record.ok) return record

    const field = record.value.fields.get(normalizeFieldName(expression.fieldName))
    if (!field) {
      return { ok: false, error: `Line ${expression.line}: Record '${record.name}' has no field '${expression.fieldName}'.` }
    }

    return { ok: true, value: field.value }
  }

  if (expression.kind === 'functionCall') {
    return evaluateFunctionCall(expression, state)
  }

  if (expression.kind === 'unary') {
    const value = evaluateExpression(expression.expression, state)
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

  const left = evaluateExpression(expression.left, state)
  if (!left.ok) return left

  const right = evaluateExpression(expression.right, state)
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

function evaluateFunctionCall(
  expression: Extract<Expression, { kind: 'functionCall' }>,
  state: RuntimeState,
): EvaluationResult {
  const userFunction = state.functions.get(normalizeCallableName(expression.name))
  if (userFunction) return evaluateUserFunctionCall(expression, userFunction, state)

  const args: RuntimeValue[] = []

  for (const arg of expression.args) {
    const evaluated = evaluateExpression(arg, state)
    if (!evaluated.ok) return evaluated
    args.push(evaluated.value)
  }

  if (expression.name === 'EOF') {
    const arity = checkArity(expression.name, args, 1, expression.line)
    if (!arity.ok) return arity
    const fileName = expectString(expression.name, args[0], 1, expression.line)
    if (!fileName.ok) return fileName
    const file = state.files.get(fileName.value)
    if (!file || file.mode !== 'READ') {
      return { ok: false, error: `Line ${expression.line}: File '${fileName.value}' is not open for reading.` }
    }
    return { ok: true, value: file.pointer >= file.lines.length }
  }

  if (expression.name === 'ASC') {
    const arity = checkArity(expression.name, args, 1, expression.line)
    if (!arity.ok) return arity
    if (typeof args[0] !== 'string') {
      return { ok: false, error: `Line ${expression.line}: ASC expects argument 1 to be CHAR.` }
    }
    if (args[0].length !== 1) {
      return { ok: false, error: `Line ${expression.line}: ASC expects a single character.` }
    }
    return { ok: true, value: args[0].charCodeAt(0) }
  }

  if (expression.name === 'CHR') {
    const arity = checkArity(expression.name, args, 1, expression.line)
    if (!arity.ok) return arity
    const value = expectInteger(expression.name, args[0], 1, expression.line)
    if (!value.ok) return value
    if (value.value < 0 || value.value > 65535) {
      return { ok: false, error: `Line ${expression.line}: CHR value must be between 0 and 65535.` }
    }
    return { ok: true, value: String.fromCharCode(value.value) }
  }

  if (expression.name === 'LENGTH') {
    const arity = checkArity(expression.name, args, 1, expression.line)
    if (!arity.ok) return arity
    const text = expectString(expression.name, args[0], 1, expression.line)
    if (!text.ok) return text
    return { ok: true, value: text.value.length }
  }

  if (expression.name === 'LEFT') {
    const arity = checkArity(expression.name, args, 2, expression.line)
    if (!arity.ok) return arity
    const text = expectString(expression.name, args[0], 1, expression.line)
    if (!text.ok) return text
    const count = expectInteger(expression.name, args[1], 2, expression.line)
    if (!count.ok) return count
    if (count.value < 0) return { ok: false, error: `Line ${expression.line}: LEFT count cannot be negative.` }
    return { ok: true, value: text.value.slice(0, count.value) }
  }

  if (expression.name === 'RIGHT') {
    const arity = checkArity(expression.name, args, 2, expression.line)
    if (!arity.ok) return arity
    const text = expectString(expression.name, args[0], 1, expression.line)
    if (!text.ok) return text
    const count = expectInteger(expression.name, args[1], 2, expression.line)
    if (!count.ok) return count
    if (count.value < 0) return { ok: false, error: `Line ${expression.line}: RIGHT count cannot be negative.` }
    return { ok: true, value: count.value >= text.value.length ? text.value : text.value.slice(text.value.length - count.value) }
  }

  if (expression.name === 'MID') {
    const arity = checkArity(expression.name, args, 3, expression.line)
    if (!arity.ok) return arity
    const text = expectString(expression.name, args[0], 1, expression.line)
    if (!text.ok) return text
    const start = expectInteger(expression.name, args[1], 2, expression.line)
    if (!start.ok) return start
    const count = expectInteger(expression.name, args[2], 3, expression.line)
    if (!count.ok) return count
    if (start.value < 1) return { ok: false, error: `Line ${expression.line}: MID start position must be at least 1.` }
    if (count.value < 0) return { ok: false, error: `Line ${expression.line}: MID count cannot be negative.` }
    return { ok: true, value: text.value.slice(start.value - 1, start.value - 1 + count.value) }
  }

  if (expression.name === 'UCASE' || expression.name === 'LCASE') {
    const arity = checkArity(expression.name, args, 1, expression.line)
    if (!arity.ok) return arity
    const text = expectString(expression.name, args[0], 1, expression.line)
    if (!text.ok) return text
    return { ok: true, value: expression.name === 'UCASE' ? text.value.toUpperCase() : text.value.toLowerCase() }
  }

  if (expression.name === 'INT') {
    const arity = checkArity(expression.name, args, 1, expression.line)
    if (!arity.ok) return arity
    const number = expectNumber(expression.name, args[0], 1, expression.line)
    if (!number.ok) return number
    return { ok: true, value: Math.trunc(number.value) }
  }

  if (expression.name === 'ROUND') {
    const arity = checkArityRange(expression.name, args, 1, 2, expression.line)
    if (!arity.ok) return arity
    const number = expectNumber(expression.name, args[0], 1, expression.line)
    if (!number.ok) return number
    if (args.length === 1) return { ok: true, value: Math.round(number.value) }
    const decimalPlaces = expectInteger(expression.name, args[1], 2, expression.line)
    if (!decimalPlaces.ok) return decimalPlaces
    if (decimalPlaces.value < 0) return { ok: false, error: `Line ${expression.line}: ROUND decimal places cannot be negative.` }
    const factor = 10 ** decimalPlaces.value
    return { ok: true, value: Math.round(number.value * factor) / factor }
  }

  if (expression.name === 'RANDOMBETWEEN') {
    const arity = checkArity(expression.name, args, 2, expression.line)
    if (!arity.ok) return arity
    const low = expectInteger(expression.name, args[0], 1, expression.line)
    if (!low.ok) return low
    const high = expectInteger(expression.name, args[1], 2, expression.line)
    if (!high.ok) return high
    if (low.value > high.value) {
      return { ok: false, error: `Line ${expression.line}: RANDOMBETWEEN lower bound cannot be greater than upper bound.` }
    }
    return { ok: true, value: Math.floor(Math.random() * (high.value - low.value + 1)) + low.value }
  }

  return { ok: false, error: `Line ${expression.line}: Unknown function '${expression.name}'.` }
}

function evaluateUserFunctionCall(
  expression: Extract<Expression, { kind: 'functionCall' }>,
  definition: FunctionDefinition,
  state: RuntimeState,
): EvaluationResult {
  if (expression.args.length !== definition.parameters.length) {
    return {
      ok: false,
      error: `Line ${expression.line}: Function '${definition.name}' expects ${definition.parameters.length} ${
        definition.parameters.length === 1 ? 'argument' : 'arguments'
      } but got ${expression.args.length}.`,
    }
  }

  if (state.callDepth >= maxProcedureCallDepth) {
    return {
      ok: false,
      error: `Line ${expression.line}: Function call depth limit exceeded. Possible infinite recursion.`,
    }
  }

  const localScope = new Map<string, ScalarVariable>()

  for (let index = 0; index < definition.parameters.length; index += 1) {
    const parameter = definition.parameters[index]
    const arg = evaluateExpression(expression.args[index], state)
    if (!arg.ok) return arg

    if (!canAssign(parameter.type, arg.value)) {
      return {
        ok: false,
        error: `Line ${expression.line}: Argument ${index + 1} for function '${definition.name}' must be ${parameter.type} but got ${valueType(
          arg.value,
        )}.`,
      }
    }

    localScope.set(normalizeVariableName(parameter.name), {
      kind: 'scalar',
      type: parameter.type,
      value: arg.value,
    })
  }

  const previousReturn = state.functionReturn
  const errorCount = state.errors.length
  state.functionReturn = undefined
  state.callDepth += 1
  state.functionDepth += 1
  state.localScopes.push(localScope)
  executeStatements(definition.body, state)
  state.localScopes.pop()
  state.functionDepth -= 1
  state.callDepth -= 1

  if (state.errors.length > errorCount) {
    const error = state.errors.pop()!
    state.functionReturn = previousReturn
    return { ok: false, error }
  }

  const returned = state.functionReturn as { value: RuntimeValue; line: number } | undefined
  state.functionReturn = previousReturn

  if (!returned) {
    return {
      ok: false,
      error: `Line ${expression.line}: Function '${definition.name}' ended without RETURN.`,
    }
  }

  if (!canAssign(definition.returnType, returned.value)) {
    return {
      ok: false,
      error: `Line ${returned.line}: Function '${definition.name}' must return ${definition.returnType} but got ${valueType(returned.value)}.`,
    }
  }

  return { ok: true, value: returned.value }
}

function checkArity(name: string, args: RuntimeValue[], expected: number, line: number): { ok: true } | { ok: false; error: string } {
  if (args.length !== expected) {
    return { ok: false, error: `Line ${line}: ${name} expects ${expected} ${expected === 1 ? 'argument' : 'arguments'} but got ${args.length}.` }
  }
  return { ok: true }
}

function checkArityRange(
  name: string,
  args: RuntimeValue[],
  min: number,
  max: number,
  line: number,
): { ok: true } | { ok: false; error: string } {
  if (args.length < min || args.length > max) {
    return { ok: false, error: `Line ${line}: ${name} expects ${min} or ${max} arguments but got ${args.length}.` }
  }
  return { ok: true }
}

function expectString(
  name: string,
  value: RuntimeValue,
  position: number,
  line: number,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value === 'string') return { ok: true, value }
  return { ok: false, error: `Line ${line}: ${name} expects argument ${position} to be STRING.` }
}

function expectInteger(
  name: string,
  value: RuntimeValue,
  position: number,
  line: number,
): { ok: true; value: number } | { ok: false; error: string } {
  if (isIntegerValue(value)) return { ok: true, value }
  return { ok: false, error: `Line ${line}: ${name} expects argument ${position} to be INTEGER.` }
}

function expectNumber(
  name: string,
  value: RuntimeValue,
  position: number,
  line: number,
): { ok: true; value: number } | { ok: false; error: string } {
  if (typeof value === 'number') return { ok: true, value }
  return { ok: false, error: `Line ${line}: ${name} expects argument ${position} to be NUMBER.` }
}

function evaluateIndices(
  expressions: Expression[],
  state: RuntimeState,
): { ok: true; value: number[] } | { ok: false; error: string } {
  const indices: number[] = []

  for (const expression of expressions) {
    const index = evaluateExpression(expression, state)
    if (!index.ok) return index

    if (!isIntegerValue(index.value)) {
      return { ok: false, error: `Line ${expression.line}: Array index must be INTEGER.` }
    }

    indices.push(index.value)
  }

  return { ok: true, value: indices }
}

function evaluateStringIndices(
  expressions: Expression[],
  state: RuntimeState,
): { ok: true; value: number[] } | { ok: false; error: string } {
  const indices: number[] = []

  for (const expression of expressions) {
    const index = evaluateExpression(expression, state)
    if (!index.ok) return index

    if (!isIntegerValue(index.value)) {
      return { ok: false, error: `Line ${expression.line}: String index must be INTEGER.` }
    }

    indices.push(index.value)
  }

  return { ok: true, value: indices }
}

function resolveStringIndex(name: string, value: RuntimeValue, indices: number[], line: number): EvaluationResult {
  if (indices.length !== 1) {
    return {
      ok: false,
      error: `Line ${line}: String '${name}' expects 1 index but got ${indices.length}.`,
    }
  }

  const text = String(value)
  const [index] = indices
  if (index < 1 || index > text.length) {
    return {
      ok: false,
      error: `Line ${line}: String index ${index} out of bounds for '${name}'. Valid range is 1 to ${text.length}.`,
    }
  }

  return { ok: true, value: text[index - 1] }
}

function checkArrayAccess(
  name: string,
  variable: ArrayVariable,
  indices: number[],
  line: number,
): { ok: true } | { ok: false; error: string } {
  if (indices.length !== variable.bounds.length) {
    return {
      ok: false,
      error: `Line ${line}: Array '${name}' expects ${variable.bounds.length} ${variable.bounds.length === 1 ? 'index' : 'indexes'} but got ${indices.length}.`,
    }
  }

  if (variable.bounds.length === 1) {
    const [bound] = variable.bounds
    const [index] = indices
    if (index < bound.lower || index > bound.upper) {
      return {
        ok: false,
        error: `Line ${line}: Array index ${index} out of bounds for '${name}'. Valid range is ${bound.lower} to ${bound.upper}.`,
      }
    }

    return { ok: true }
  }

  const [rowBound, columnBound] = variable.bounds
  const [row, column] = indices

  if (row < rowBound.lower || row > rowBound.upper) {
    return {
      ok: false,
      error: `Line ${line}: Array row index ${row} out of bounds for '${name}'. Valid row range is ${rowBound.lower} to ${rowBound.upper}.`,
    }
  }

  if (column < columnBound.lower || column > columnBound.upper) {
    return {
      ok: false,
      error: `Line ${line}: Array column index ${column} out of bounds for '${name}'. Valid column range is ${columnBound.lower} to ${columnBound.upper}.`,
    }
  }

  return { ok: true }
}

function arrayKey(indices: number[]): string {
  return indices.join(',')
}

function compareValues(
  left: RuntimeValue,
  right: RuntimeValue,
  operator: '=' | '<>' | '<' | '<=' | '>' | '>=',
  line: number,
): EvaluationResult {
  if (operator === '=') return { ok: true, value: left === right }
  if (operator === '<>') return { ok: true, value: left !== right }

  if (isCharValue(left) && isCharValue(right)) {
    return { ok: false, error: `Line ${line}: Operator '${operator}' is not supported for CHAR values.` }
  }

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

  if (type === 'CHAR') {
    if (rawInput.length === 1) return { ok: true, value: rawInput }
    return { ok: false, error: `Line ${line}: Cannot convert input '${rawInput}' to CHAR.` }
  }

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

function convertFileValue(rawValue: string, type: VariableType, line: number): EvaluationResult {
  const converted = convertInput(rawValue, type, line)
  if (converted.ok) return converted

  const typeText = type === 'BOOLEAN' ? 'BOOLEAN' : type
  return { ok: false, error: `Line ${line}: Cannot convert file value '${rawValue}' to ${typeText}.` }
}

function getOrCreateFile(fileName: string, state: RuntimeState): VirtualFile {
  const existing = state.files.get(fileName)
  if (existing) return existing

  const file: VirtualFile = {
    mode: null,
    lines: [],
    pointer: 0,
  }
  state.files.set(fileName, file)
  return file
}

function createRecordValue(typeDefinition: TypeDefinition): RecordValue {
  const fields = new Map<string, RecordFieldValue>()

  for (const field of typeDefinition.fields) {
    fields.set(normalizeFieldName(field.name), {
      name: field.name,
      type: field.type,
      value: defaultValue(field.type),
    })
  }

  return {
    typeName: typeDefinition.name,
    fields,
  }
}

function cloneRecordValue(record: RecordValue): RecordValue {
  return {
    typeName: record.typeName,
    fields: new Map(
      [...record.fields.entries()].map(([key, field]) => [
        key,
        {
          name: field.name,
          type: field.type,
          value: field.value,
        },
      ]),
    ),
  }
}

function isRecordValue(value: RuntimeValue | RecordValue): value is RecordValue {
  return typeof value === 'object' && value !== null && 'fields' in value
}

function isScalarType(type: DataType): type is VariableType {
  return type === 'INTEGER' || type === 'REAL' || type === 'STRING' || type === 'BOOLEAN' || type === 'CHAR'
}

function defaultValue(type: VariableType): RuntimeValue {
  if (type === 'STRING' || type === 'CHAR') return ''
  if (type === 'BOOLEAN') return false
  return 0
}

function canAssign(type: VariableType, value: RuntimeValue): boolean {
  if (type === 'INTEGER') return typeof value === 'number' && Number.isInteger(value)
  if (type === 'REAL') return typeof value === 'number'
  if (type === 'STRING') return typeof value === 'string'
  if (type === 'CHAR') return typeof value === 'string' && value.length === 1
  return typeof value === 'boolean'
}

function isComparisonOperator(operator: string): operator is '=' | '<>' | '<' | '<=' | '>' | '>=' {
  return operator === '=' || operator === '<>' || operator === '<' || operator === '<=' || operator === '>' || operator === '>='
}

function isIntegerValue(value: RuntimeValue): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function isCharValue(value: RuntimeValue): value is string {
  return typeof value === 'string' && value.length === 1
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
      if (variable.kind === 'record') return [name, recordToPublicObject(variable.value)]

      return [
        name,
        Object.fromEntries(
          [...variable.values.entries()].map(([index, value]) => [
            String(index),
            isRecordValue(value) ? recordToPublicObject(value) : value,
          ]),
        ),
      ]
    }),
  )
}

function recordToPublicObject(record: RecordValue): Record<string, unknown> {
  return Object.fromEntries([...record.fields.values()].map((field) => [field.name, field.value]))
}

function toPublicFiles(files: Map<string, VirtualFile>): Record<string, string[]> {
  return Object.fromEntries([...files.entries()].map(([name, file]) => [name, [...file.lines]]))
}
