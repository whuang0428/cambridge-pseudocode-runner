type ExampleProgram = {
  name: string
  code: string
  inputText?: string
  expectedOutput: string[]
  expectedErrors?: string[]
}

export const examplePrograms: ExampleProgram[] = [
  {
    name: 'Input and total',
    code: `DECLARE A : INTEGER
DECLARE B : INTEGER
INPUT A
INPUT B
OUTPUT "Total: ", A + B`,
    inputText: `3
5`,
    expectedOutput: ['Total: 8'],
  },
  {
    name: 'Integer DIV and MOD',
    code: `DECLARE A : INTEGER
A ← 17
OUTPUT A DIV 5
OUTPUT A MOD 5`,
    expectedOutput: ['3', '2'],
  },
  {
    name: 'Comparisons and boolean logic',
    code: `DECLARE A : INTEGER
A ← 5
OUTPUT A > 3 AND A < 10
OUTPUT NOT (A = 5)`,
    expectedOutput: ['TRUE', 'FALSE'],
  },
  {
    name: 'Phase 1 numbers and strings',
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
    name: 'Invalid integer input',
    code: `DECLARE Number : INTEGER
INPUT Number`,
    inputText: 'abc',
    expectedOutput: [],
    expectedErrors: ["Line 2: Cannot convert input 'abc' to INTEGER."],
  },
  {
    name: 'Not enough input',
    code: `DECLARE Number : INTEGER
INPUT Number`,
    expectedOutput: [],
    expectedErrors: ['Line 2: Not enough input values.'],
  },
]
