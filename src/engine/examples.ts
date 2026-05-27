type ExampleProgram = {
  name: string
  code: string
  inputText?: string
  expectedOutput: string[]
  expectedErrors?: string[]
}

export const examplePrograms: ExampleProgram[] = [
  {
    name: 'Array assignment and output',
    code: `DECLARE Scores : ARRAY[1:3] OF INTEGER

Scores[1] ← 80
Scores[2] ← 65
Scores[3] ← 90

OUTPUT Scores[1]
OUTPUT Scores[2]
OUTPUT Scores[3]`,
    expectedOutput: ['80', '65', '90'],
  },
  {
    name: 'Array variable index',
    code: `DECLARE Scores : ARRAY[1:5] OF INTEGER
DECLARE I : INTEGER

FOR I ← 1 TO 5
    Scores[I] ← I * 10
NEXT I

FOR I ← 1 TO 5
    OUTPUT Scores[I]
NEXT I`,
    expectedOutput: ['10', '20', '30', '40', '50'],
  },
  {
    name: 'Array total',
    code: `DECLARE Scores : ARRAY[1:5] OF INTEGER
DECLARE I : INTEGER
DECLARE Total : INTEGER

Total ← 0

FOR I ← 1 TO 5
    Scores[I] ← I * 10
    Total ← Total + Scores[I]
NEXT I

OUTPUT "Total: ", Total`,
    expectedOutput: ['Total: 150'],
  },
  {
    name: 'Input into array elements',
    code: `DECLARE Scores : ARRAY[1:3] OF INTEGER
DECLARE I : INTEGER

FOR I ← 1 TO 3
    INPUT Scores[I]
NEXT I

FOR I ← 1 TO 3
    OUTPUT Scores[I]
NEXT I`,
    inputText: `80
65
90`,
    expectedOutput: ['80', '65', '90'],
  },
  {
    name: 'Array bounds error',
    code: `DECLARE Scores : ARRAY[1:5] OF INTEGER
Scores[6] ← 100`,
    expectedOutput: [],
    expectedErrors: ["Line 2: Array index 6 out of bounds for 'Scores'. Valid range is 1 to 5."],
  },
  {
    name: 'Phase 6 REPEAT loop',
    code: `DECLARE Count : INTEGER
Count ← 1

REPEAT
    OUTPUT Count
    Count ← Count + 1
UNTIL Count > 5`,
    expectedOutput: ['1', '2', '3', '4', '5'],
  },
]
