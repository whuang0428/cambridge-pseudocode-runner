type ExampleProgram = {
  name: string
  code: string
  inputText?: string
  expectedOutput: string[]
  expectedErrors?: string[]
}

export const examplePrograms: ExampleProgram[] = [
  {
    name: 'FOR loop',
    code: `DECLARE I : INTEGER

FOR I ← 1 TO 5
    OUTPUT I
NEXT I`,
    expectedOutput: ['1', '2', '3', '4', '5'],
  },
  {
    name: 'FOR loop negative step',
    code: `DECLARE I : INTEGER

FOR I ← 10 TO 2 STEP -2
    OUTPUT I
NEXT I`,
    expectedOutput: ['10', '8', '6', '4', '2'],
  },
  {
    name: 'FOR loop with IF',
    code: `DECLARE I : INTEGER

FOR I ← 1 TO 3
    IF I = 2 THEN
        OUTPUT "Middle"
    ELSE
        OUTPUT I
    ENDIF
NEXT I`,
    expectedOutput: ['1', 'Middle', '3'],
  },
  {
    name: 'Nested FOR loops',
    code: `DECLARE I : INTEGER
DECLARE J : INTEGER

FOR I ← 1 TO 2
    FOR J ← 1 TO 3
        OUTPUT "I=", I, " J=", J
    NEXT J
NEXT I`,
    expectedOutput: ['I=1 J=1', 'I=1 J=2', 'I=1 J=3', 'I=2 J=1', 'I=2 J=2', 'I=2 J=3'],
  },
  {
    name: 'NEXT mismatch',
    code: `DECLARE I : INTEGER
DECLARE J : INTEGER

FOR I ← 1 TO 5
    OUTPUT I
NEXT J`,
    expectedOutput: [],
    expectedErrors: ["Line 6: NEXT variable 'J' does not match FOR counter 'I'."],
  },
  {
    name: 'Phase 3 nested IF',
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
]
