type ExampleProgram = {
  name: string
  code: string
  inputText?: string
  expectedOutput: string[]
  expectedErrors?: string[]
}

export const examplePrograms: ExampleProgram[] = [
  {
    name: 'REPEAT loop',
    code: `DECLARE Count : INTEGER
Count ← 1

REPEAT
    OUTPUT Count
    Count ← Count + 1
UNTIL Count > 5`,
    expectedOutput: ['1', '2', '3', '4', '5'],
  },
  {
    name: 'REPEAT runs at least once',
    code: `DECLARE Count : INTEGER
Count ← 10

REPEAT
    OUTPUT Count
    Count ← Count + 1
UNTIL Count > 5`,
    expectedOutput: ['10'],
  },
  {
    name: 'REPEAT loop with IF',
    code: `DECLARE Count : INTEGER
Count ← 1

REPEAT
    IF Count = 2 THEN
        OUTPUT "Middle"
    ELSE
        OUTPUT Count
    ENDIF
    Count ← Count + 1
UNTIL Count > 3`,
    expectedOutput: ['1', 'Middle', '3'],
  },
  {
    name: 'Nested REPEAT loops',
    code: `DECLARE I : INTEGER
DECLARE J : INTEGER

I ← 1

REPEAT
    J ← 1
    REPEAT
        OUTPUT "I=", I, " J=", J
        J ← J + 1
    UNTIL J > 3
    I ← I + 1
UNTIL I > 2`,
    expectedOutput: ['I=1 J=1', 'I=1 J=2', 'I=1 J=3', 'I=2 J=1', 'I=2 J=2', 'I=2 J=3'],
  },
  {
    name: 'REPEAT inside FOR',
    code: `DECLARE I : INTEGER
DECLARE J : INTEGER

FOR I ← 1 TO 2
    J ← 1
    REPEAT
        OUTPUT "I=", I, " J=", J
        J ← J + 1
    UNTIL J > 2
NEXT I`,
    expectedOutput: ['I=1 J=1', 'I=1 J=2', 'I=2 J=1', 'I=2 J=2'],
  },
  {
    name: 'UNTIL condition must be BOOLEAN',
    code: `DECLARE Count : INTEGER
Count ← 1

REPEAT
    OUTPUT Count
    Count ← Count + 1
UNTIL Count`,
    expectedOutput: ['1'],
    expectedErrors: ['Line 7: UNTIL condition must be BOOLEAN.'],
  },
  {
    name: 'Phase 5 nested WHILE loops',
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
]
