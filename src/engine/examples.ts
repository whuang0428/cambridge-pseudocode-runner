type ExampleProgram = {
  name: string
  code: string
  inputText?: string
  expectedOutput: string[]
  expectedErrors?: string[]
}

export const examplePrograms: ExampleProgram[] = [
  {
    name: 'WHILE loop',
    code: `DECLARE Count : INTEGER
Count ← 1

WHILE Count <= 5
    OUTPUT Count
    Count ← Count + 1
ENDWHILE`,
    expectedOutput: ['1', '2', '3', '4', '5'],
  },
  {
    name: 'WHILE loop with IF',
    code: `DECLARE Count : INTEGER
Count ← 1

WHILE Count <= 3
    IF Count = 2 THEN
        OUTPUT "Middle"
    ELSE
        OUTPUT Count
    ENDIF
    Count ← Count + 1
ENDWHILE`,
    expectedOutput: ['1', 'Middle', '3'],
  },
  {
    name: 'Nested WHILE loops',
    code: `DECLARE I : INTEGER
DECLARE J : INTEGER

I ← 1

WHILE I <= 2
    J ← 1
    WHILE J <= 3
        OUTPUT "I=", I, " J=", J
        J ← J + 1
    ENDWHILE
    I ← I + 1
ENDWHILE`,
    expectedOutput: ['I=1 J=1', 'I=1 J=2', 'I=1 J=3', 'I=2 J=1', 'I=2 J=2', 'I=2 J=3'],
  },
  {
    name: 'WHILE inside FOR',
    code: `DECLARE I : INTEGER
DECLARE J : INTEGER

FOR I ← 1 TO 2
    J ← 1
    WHILE J <= 2
        OUTPUT "I=", I, " J=", J
        J ← J + 1
    ENDWHILE
NEXT I`,
    expectedOutput: ['I=1 J=1', 'I=1 J=2', 'I=2 J=1', 'I=2 J=2'],
  },
  {
    name: 'WHILE condition must be BOOLEAN',
    code: `DECLARE Count : INTEGER
Count ← 1

WHILE Count
    OUTPUT Count
    Count ← Count + 1
ENDWHILE`,
    expectedOutput: [],
    expectedErrors: ['Line 4: WHILE condition must be BOOLEAN.'],
  },
  {
    name: 'Phase 4 nested FOR loops',
    code: `DECLARE I : INTEGER
DECLARE J : INTEGER

FOR I ← 1 TO 2
    FOR J ← 1 TO 3
        OUTPUT "I=", I, " J=", J
    NEXT J
NEXT I`,
    expectedOutput: ['I=1 J=1', 'I=1 J=2', 'I=1 J=3', 'I=2 J=1', 'I=2 J=2', 'I=2 J=3'],
  },
]
