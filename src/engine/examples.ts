type ExampleProgram = {
  name: string
  code: string
  inputText?: string
  expectedOutput: string[]
  expectedErrors?: string[]
}

export const examplePrograms: ExampleProgram[] = [
  {
    name: 'CASE explicit equality labels',
    code: `DECLARE Choice : INTEGER
Choice ← 2

CASE OF Choice
    = 1 : OUTPUT "Start"
    = 2 : OUTPUT "Settings"
    OTHERWISE OUTPUT "Invalid"
ENDCASE`,
    expectedOutput: ['Settings'],
  },
  {
    name: 'CASE relational labels',
    code: `DECLARE Score : INTEGER
Score ← 75

CASE OF Score
    >= 80 : OUTPUT "High pass"
    >= 50 : OUTPUT "Pass"
    < 50 : OUTPUT "Fail"
ENDCASE`,
    expectedOutput: ['Pass'],
  },
  {
    name: 'CASE range labels',
    code: `DECLARE Score : INTEGER
Score ← 88

CASE OF Score
    80 TO 100 : OUTPUT "High pass"
    50 TO 79 : OUTPUT "Pass"
    0 TO 49 : OUTPUT "Fail"
    OTHERWISE OUTPUT "Invalid score"
ENDCASE`,
    expectedOutput: ['High pass'],
  },
  {
    name: 'CASE first matching branch wins',
    code: `DECLARE Score : INTEGER
Score ← 85

CASE OF Score
    >= 50 : OUTPUT "Pass"
    >= 80 : OUTPUT "High pass"
ENDCASE`,
    expectedOutput: ['Pass'],
  },
  {
    name: 'CASE string equality labels',
    code: `DECLARE Grade : STRING
Grade ← "A"

CASE OF Grade
    = "A" : OUTPUT "Excellent"
    <> "A" : OUTPUT "Not A"
ENDCASE`,
    expectedOutput: ['Excellent'],
  },
  {
    name: 'CASE label type mismatch',
    code: `DECLARE Score : INTEGER
Score ← 80

CASE OF Score
    "A" : OUTPUT "Excellent"
ENDCASE`,
    expectedOutput: [],
    expectedErrors: ['Line 5: CASE label type STRING does not match CASE expression type INTEGER.'],
  },
  {
    name: 'CASE invalid range order',
    code: `DECLARE Score : INTEGER
Score ← 80

CASE OF Score
    100 TO 80 : OUTPUT "Invalid range"
ENDCASE`,
    expectedOutput: [],
    expectedErrors: ['Line 5: CASE range lower bound cannot be greater than upper bound.'],
  },
]
