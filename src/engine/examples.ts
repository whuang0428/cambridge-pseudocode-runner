type ExampleProgram = {
  name: string
  code: string
  expectedOutput: string[]
  expectedErrors?: string[]
}

export const examplePrograms: ExampleProgram[] = [
  {
    name: 'Numbers and strings',
    code: `DECLARE Number : INTEGER
DECLARE Name : STRING
Number ← 5
Name ← "Tom"
OUTPUT Number
OUTPUT "Hello " + Name
OUTPUT Number + 3`,
    expectedOutput: ['5', 'Hello Tom', '8'],
  },
  {
    name: 'Operator precedence',
    code: `DECLARE Total : INTEGER
Total <- 2 + 3 * 4
OUTPUT Total
OUTPUT (2 + 3) * 4`,
    expectedOutput: ['14', '20'],
  },
  {
    name: 'Type error',
    code: `DECLARE Number : INTEGER
Number ← "Tom"
OUTPUT Number`,
    expectedOutput: [],
    expectedErrors: ["Line 2: Cannot assign STRING to INTEGER variable 'Number'."],
  },
  {
    name: 'Undeclared variable',
    code: `OUTPUT X`,
    expectedOutput: [],
    expectedErrors: ["Line 1: Variable 'X' has not been declared."],
  },
]
