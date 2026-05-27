type ExampleProgram = {
  name: string
  code: string
  inputText?: string
  expectedOutput: string[]
  expectedErrors?: string[]
}

export const examplePrograms: ExampleProgram[] = [
  {
    name: 'Two-dimensional array assignment and output',
    code: `DECLARE Grid : ARRAY[1:2, 1:3] OF INTEGER

Grid[1, 1] ← 11
Grid[1, 2] ← 12
Grid[1, 3] ← 13
Grid[2, 1] ← 21
Grid[2, 2] ← 22
Grid[2, 3] ← 23

OUTPUT Grid[1, 1]
OUTPUT Grid[2, 3]`,
    expectedOutput: ['11', '23'],
  },
  {
    name: 'Two-dimensional array variable indexes',
    code: `DECLARE Grid : ARRAY[1:2, 1:3] OF INTEGER
DECLARE Row : INTEGER
DECLARE Col : INTEGER

FOR Row ← 1 TO 2
    FOR Col ← 1 TO 3
        Grid[Row, Col] ← Row * 10 + Col
    NEXT Col
NEXT Row

FOR Row ← 1 TO 2
    FOR Col ← 1 TO 3
        OUTPUT Grid[Row, Col]
    NEXT Col
NEXT Row`,
    expectedOutput: ['11', '12', '13', '21', '22', '23'],
  },
  {
    name: 'Two-dimensional array total',
    code: `DECLARE Grid : ARRAY[1:2, 1:3] OF INTEGER
DECLARE Row : INTEGER
DECLARE Col : INTEGER
DECLARE Total : INTEGER

Total ← 0

FOR Row ← 1 TO 2
    FOR Col ← 1 TO 3
        Grid[Row, Col] ← Row * 10 + Col
        Total ← Total + Grid[Row, Col]
    NEXT Col
NEXT Row

OUTPUT "Total: ", Total`,
    expectedOutput: ['Total: 102'],
  },
  {
    name: 'Input into two-dimensional array elements',
    code: `DECLARE Grid : ARRAY[1:2, 1:2] OF INTEGER
DECLARE Row : INTEGER
DECLARE Col : INTEGER

FOR Row ← 1 TO 2
    FOR Col ← 1 TO 2
        INPUT Grid[Row, Col]
    NEXT Col
NEXT Row

FOR Row ← 1 TO 2
    FOR Col ← 1 TO 2
        OUTPUT Grid[Row, Col]
    NEXT Col
NEXT Row`,
    inputText: `10
20
30
40`,
    expectedOutput: ['10', '20', '30', '40'],
  },
  {
    name: 'Two-dimensional array column bounds error',
    code: `DECLARE Grid : ARRAY[1:2, 1:3] OF INTEGER
OUTPUT Grid[1, 4]`,
    expectedOutput: [],
    expectedErrors: ["Line 2: Array column index 4 out of bounds for 'Grid'. Valid column range is 1 to 3."],
  },
  {
    name: 'One-dimensional array too many indexes',
    code: `DECLARE Scores : ARRAY[1:5] OF INTEGER
OUTPUT Scores[1, 2]`,
    expectedOutput: [],
    expectedErrors: ["Line 2: Array 'Scores' expects 1 index but got 2."],
  },
  {
    name: 'Two-dimensional array too few indexes',
    code: `DECLARE Grid : ARRAY[1:2, 1:3] OF INTEGER
OUTPUT Grid[1]`,
    expectedOutput: [],
    expectedErrors: ["Line 2: Array 'Grid' expects 2 indexes but got 1."],
  },
  {
    name: 'Phase 7 one-dimensional array',
    code: `DECLARE Scores : ARRAY[1:3] OF INTEGER
Scores[1] ← 80
OUTPUT Scores[1]`,
    expectedOutput: ['80'],
  },
]
