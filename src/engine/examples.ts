type ExampleProgram = {
  name: string
  code: string
  inputText?: string
  expectedOutput: string[]
  expectedErrors?: string[]
}

export const examplePrograms: ExampleProgram[] = [
  {
    name: 'IF with ELSE',
    code: `DECLARE Score : INTEGER
INPUT Score

IF Score >= 50 THEN
    OUTPUT "Pass"
ELSE
    OUTPUT "Fail"
ENDIF`,
    inputText: '75',
    expectedOutput: ['Pass'],
  },
  {
    name: 'IF without ELSE',
    code: `DECLARE Number : INTEGER
Number ← 5

IF Number > 0 THEN
    OUTPUT "Positive"
ENDIF`,
    expectedOutput: ['Positive'],
  },
  {
    name: 'Nested IF',
    code: `DECLARE Score : INTEGER
INPUT Score

IF Score >= 50 THEN
    IF Score >= 80 THEN
        OUTPUT "High pass"
    ELSE
        OUTPUT "Pass"
    ENDIF
ELSE
    OUTPUT "Fail"
ENDIF`,
    inputText: '85',
    expectedOutput: ['High pass'],
  },
  {
    name: 'Nested IF middle branch',
    code: `DECLARE Score : INTEGER
INPUT Score

IF Score >= 50 THEN
    IF Score >= 80 THEN
        OUTPUT "High pass"
    ELSE
        OUTPUT "Pass"
    ENDIF
ELSE
    OUTPUT "Fail"
ENDIF`,
    inputText: '60',
    expectedOutput: ['Pass'],
  },
  {
    name: 'Nested IF else branch',
    code: `DECLARE Score : INTEGER
INPUT Score

IF Score >= 50 THEN
    IF Score >= 80 THEN
        OUTPUT "High pass"
    ELSE
        OUTPUT "Pass"
    ENDIF
ELSE
    OUTPUT "Fail"
ENDIF`,
    inputText: '40',
    expectedOutput: ['Fail'],
  },
  {
    name: 'IF condition must be BOOLEAN',
    code: `DECLARE Score : INTEGER
Score ← 50

IF Score THEN
    OUTPUT "Invalid"
ENDIF`,
    expectedOutput: [],
    expectedErrors: ['Line 4: IF condition must be BOOLEAN.'],
  },
  {
    name: 'Phase 2 input and total',
    code: `DECLARE A : INTEGER
DECLARE B : INTEGER
INPUT A
INPUT B
OUTPUT "Total: ", A + B`,
    inputText: `3
5`,
    expectedOutput: ['Total: 8'],
  },
]
