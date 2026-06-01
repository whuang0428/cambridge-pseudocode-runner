type ExampleProgram = {
  name: string
  code: string
  inputText?: string
  expectedOutput: string[]
  expectedErrors?: string[]
}

export const examplePrograms: ExampleProgram[] = [
  {
    name: 'Comments and equals assignment',
    code: `# This program adds two numbers
DECLARE A : INTEGER
DECLARE B : INTEGER

A <- 3
B = 5

OUTPUT "Total: ", A + B // print total`,
    expectedOutput: ['Total: 8'],
  },
  {
    name: 'Lowercase keywords and optional THEN',
    code: `declare number : integer
number = 5

if number = 5
    output "Five"
end if`,
    expectedOutput: ['Five'],
  },
  {
    name: 'NEXT without counter',
    code: `DECLARE I : INTEGER

FOR I ← 1 TO 3
    OUTPUT I
NEXT`,
    expectedOutput: ['1', '2', '3'],
  },
  {
    name: 'Comment markers inside strings',
    code: `OUTPUT "http://example.com"
OUTPUT "A # B"`,
    expectedOutput: ['http://example.com', 'A # B'],
  },
  {
    name: 'Error help: undeclared variable',
    code: `OUTPUT Score`,
    expectedOutput: [],
    expectedErrors: [
      "Line 1: Variable 'Score' has not been declared.\nPossible reason: You used Score before declaring it.\nSuggestion: Add DECLARE Score : INTEGER, DECLARE Score : STRING, or another suitable type before using it.",
    ],
  },
  {
    name: 'Error help: type mismatch',
    code: `DECLARE Number : INTEGER
Number = "Tom"`,
    expectedOutput: [],
    expectedErrors: [
      "Line 2: Cannot assign STRING to INTEGER variable 'Number'.\nPossible reason: The value type does not match the declared variable type.\nSuggestion: Check the DECLARE line for Number, or change the assigned value to an INTEGER.",
    ],
  },
  {
    name: 'Error help: missing ENDIF',
    code: `DECLARE Number : INTEGER
Number = 5
IF Number = 5
    OUTPUT "Five"`,
    expectedOutput: [],
    expectedErrors: [
      'Line 3: Missing ENDIF for IF statement.\nPossible reason: Every IF block must be closed.\nSuggestion: Add ENDIF after the statements inside the IF block.',
    ],
  },
  {
    name: 'Error help: array out of bounds',
    code: `DECLARE Scores : ARRAY[1:3] OF INTEGER
OUTPUT Scores[4]`,
    expectedOutput: [],
    expectedErrors: [
      "Line 2: Array index 4 out of bounds for 'Scores'. Valid range is 1 to 3.\nPossible reason: You tried to access an array position outside its declared range.\nSuggestion: Check the ARRAY declaration and make sure the index is within the valid range.",
    ],
  },
  {
    name: 'Error help: division by zero',
    code: `OUTPUT 10 / 0`,
    expectedOutput: [],
    expectedErrors: [
      'Line 1: Division by zero.\nPossible reason: The right side of /, DIV, or MOD became 0.\nSuggestion: Check the value of the divisor before dividing.',
    ],
  },
]
