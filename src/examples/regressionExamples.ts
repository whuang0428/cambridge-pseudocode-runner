export type RegressionExample = {
  id: string
  title: string
  code: string
  input?: string
  expectedOutput?: string[]
  expectedErrorIncludes?: string[]
}

export const regressionExamples: RegressionExample[] = [
  {
    id: 'basic-declaration-output',
    title: 'Basic declaration and output',
    code: `DECLARE Number : INTEGER
Number ← 5
OUTPUT Number`,
    expectedOutput: ['5'],
  },
  {
    id: 'input-and-if',
    title: 'INPUT and IF',
    code: `DECLARE Score : INTEGER
INPUT Score

IF Score >= 50 THEN
    OUTPUT "Pass"
ELSE
    OUTPUT "Fail"
ENDIF`,
    input: '75',
    expectedOutput: ['Pass'],
  },
  {
    id: 'for-loop-total',
    title: 'FOR loop total',
    code: `DECLARE I : INTEGER
DECLARE Total : INTEGER

Total ← 0

FOR I ← 1 TO 5
    Total ← Total + I
NEXT I

OUTPUT Total`,
    expectedOutput: ['15'],
  },
  {
    id: 'while-loop',
    title: 'WHILE loop',
    code: `DECLARE Count : INTEGER
Count ← 1

WHILE Count <= 3
    OUTPUT Count
    Count ← Count + 1
ENDWHILE`,
    expectedOutput: ['1', '2', '3'],
  },
  {
    id: 'repeat-until-loop',
    title: 'REPEAT UNTIL loop',
    code: `DECLARE Count : INTEGER
Count ← 1

REPEAT
    OUTPUT Count
    Count ← Count + 1
UNTIL Count > 3`,
    expectedOutput: ['1', '2', '3'],
  },
  {
    id: 'one-dimensional-array',
    title: 'One-dimensional array',
    code: `DECLARE Scores : ARRAY[1:3] OF INTEGER
DECLARE I : INTEGER

FOR I ← 1 TO 3
    Scores[I] ← I * 10
NEXT I

FOR I ← 1 TO 3
    OUTPUT Scores[I]
NEXT I`,
    expectedOutput: ['10', '20', '30'],
  },
  {
    id: 'two-dimensional-array',
    title: 'Two-dimensional array',
    code: `DECLARE Grid : ARRAY[1:2, 1:2] OF INTEGER
Grid[1, 1] ← 10
Grid[1, 2] ← 20
Grid[2, 1] ← 30
Grid[2, 2] ← 40

OUTPUT Grid[1, 1] + Grid[2, 2]`,
    expectedOutput: ['50'],
  },
  {
    id: 'case-range',
    title: 'CASE range',
    code: `DECLARE Score : INTEGER
Score ← 85

CASE OF Score
    80 TO 100 : OUTPUT "High pass"
    50 TO 79 : OUTPUT "Pass"
    OTHERWISE OUTPUT "Fail"
ENDCASE`,
    expectedOutput: ['High pass'],
  },
  {
    id: 'case-comparison-label',
    title: 'CASE comparison label',
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
    id: 'string-indexing-and-asc',
    title: 'String indexing and ASC',
    code: `DECLARE Word : STRING
Word ← "ABC"

OUTPUT Word[1]
OUTPUT ASC(Word[1])`,
    expectedOutput: ['A', '65'],
  },
  {
    id: 'char',
    title: 'CHAR',
    code: `DECLARE Letter : CHAR
Letter ← "A"
OUTPUT Letter
OUTPUT ASC(Letter)`,
    expectedOutput: ['A', '65'],
  },
  {
    id: 'comments-and-friendly-syntax',
    title: 'Comments and friendly syntax',
    code: `# Friendly syntax test
declare number : integer
number = 5
output number // should print 5
OUTPUT "http://example.com"
OUTPUT "A # B"`,
    expectedOutput: ['5', 'http://example.com', 'A # B'],
  },
  {
    id: 'next-without-counter',
    title: 'NEXT without counter',
    code: `DECLARE I : INTEGER

FOR I ← 1 TO 3
    OUTPUT I
NEXT`,
    expectedOutput: ['1', '2', '3'],
  },
  {
    id: 'equals-assignment-and-comparison',
    title: 'Equals assignment and comparison',
    code: `DECLARE Number : INTEGER
Number = 5

IF Number = 5 THEN
    OUTPUT "Five"
ENDIF`,
    expectedOutput: ['Five'],
  },
  {
    id: 'comments-inside-strings',
    title: 'Comments inside strings',
    code: `OUTPUT "http://example.com"
OUTPUT "A # B"`,
    expectedOutput: ['http://example.com', 'A # B'],
  },
  {
    id: 'procedure-byvalue',
    title: 'Procedure BYVALUE',
    code: `PROCEDURE AddOne(Number : INTEGER)
    Number ← Number + 1
    OUTPUT Number
ENDPROCEDURE

DECLARE X : INTEGER
X ← 5
CALL AddOne(X)
OUTPUT X`,
    expectedOutput: ['6', '5'],
  },
  {
    id: 'procedure-byref',
    title: 'Procedure BYREF',
    code: `PROCEDURE AddOne(BYREF Number : INTEGER)
    Number ← Number + 1
ENDPROCEDURE

DECLARE X : INTEGER
X ← 5
CALL AddOne(X)
OUTPUT X`,
    expectedOutput: ['6'],
  },
  {
    id: 'function-return',
    title: 'Function return',
    code: `FUNCTION Add(A : INTEGER, B : INTEGER) RETURNS INTEGER
    RETURN A + B
ENDFUNCTION

OUTPUT Add(3, 5)`,
    expectedOutput: ['8'],
  },
  {
    id: 'function-inside-if',
    title: 'Function inside IF',
    code: `FUNCTION IsPass(Score : INTEGER) RETURNS BOOLEAN
    RETURN Score >= 50
ENDFUNCTION

DECLARE Score : INTEGER
Score ← 75

IF IsPass(Score) THEN
    OUTPUT "Pass"
ELSE
    OUTPUT "Fail"
ENDIF`,
    expectedOutput: ['Pass'],
  },
  {
    id: 'record-variable',
    title: 'Record variable',
    code: `TYPE StudentRecord
    DECLARE Name : STRING
    DECLARE Score : INTEGER
ENDTYPE

DECLARE Student : StudentRecord

Student.Name ← "Tom"
Student.Score ← 85

OUTPUT Student.Name
OUTPUT Student.Score`,
    expectedOutput: ['Tom', '85'],
  },
  {
    id: 'array-of-records',
    title: 'Array of records',
    code: `TYPE StudentRecord
    DECLARE Name : STRING
    DECLARE Score : INTEGER
ENDTYPE

DECLARE Students : ARRAY[1:2] OF StudentRecord
DECLARE I : INTEGER

Students[1].Name ← "Tom"
Students[1].Score ← 85
Students[2].Name ← "Anna"
Students[2].Score ← 92

FOR I ← 1 TO 2
    OUTPUT Students[I].Name, " ", Students[I].Score
NEXT I`,
    expectedOutput: ['Tom 85', 'Anna 92'],
  },
  {
    id: 'virtual-file-handling',
    title: 'Virtual file handling',
    code: `DECLARE Number : INTEGER

OPENFILE "numbers.txt" FOR WRITE
WRITEFILE "numbers.txt", 10
WRITEFILE "numbers.txt", 20
CLOSEFILE "numbers.txt"

OPENFILE "numbers.txt" FOR READ
WHILE NOT EOF("numbers.txt")
    READFILE "numbers.txt", Number
    OUTPUT Number
ENDWHILE
CLOSEFILE "numbers.txt"`,
    expectedOutput: ['10', '20'],
  },
  {
    id: 'function-case-comparison-labels',
    title: 'Function with CASE comparison labels',
    code: `FUNCTION Grade(Score : INTEGER) RETURNS STRING
    CASE OF Score
        >= 80 : RETURN "High pass"
        >= 50 : RETURN "Pass"
        < 50 : RETURN "Fail"
    ENDCASE
ENDFUNCTION

OUTPUT Grade(85)
OUTPUT Grade(60)
OUTPUT Grade(40)`,
    expectedOutput: ['High pass', 'Pass', 'Fail'],
  },
  {
    id: 'error-undeclared-variable',
    title: 'Error: undeclared variable',
    code: `Score ← 85`,
    expectedErrorIncludes: ["Variable 'Score' has not been declared."],
  },
  {
    id: 'error-type-mismatch',
    title: 'Error: type mismatch',
    code: `DECLARE Number : INTEGER
Number ← "Tom"`,
    expectedErrorIncludes: ["Cannot assign STRING to INTEGER variable 'Number'."],
  },
  {
    id: 'error-array-out-of-bounds',
    title: 'Error: array out of bounds',
    code: `DECLARE Scores : ARRAY[1:5] OF INTEGER
OUTPUT Scores[6]`,
    expectedErrorIncludes: ['out of bounds'],
  },
  {
    id: 'error-missing-endif',
    title: 'Error: missing ENDIF',
    code: `DECLARE Score : INTEGER
Score ← 75

IF Score >= 50 THEN
    OUTPUT "Pass"`,
    expectedErrorIncludes: ['Missing ENDIF'],
  },
  {
    id: 'error-division-by-zero',
    title: 'Error: division by zero',
    code: `DECLARE A : INTEGER
A ← 10
OUTPUT A DIV 0`,
    expectedErrorIncludes: ['Division by zero'],
  },
  {
    id: 'error-function-missing-return',
    title: 'Error: function missing RETURN',
    code: `FUNCTION NoReturn() RETURNS INTEGER
    OUTPUT "No return"
ENDFUNCTION

OUTPUT NoReturn()`,
    expectedErrorIncludes: ['ended without RETURN'],
  },
  {
    id: 'error-byref-invalid-argument',
    title: 'Error: BYREF invalid argument',
    code: `PROCEDURE AddOne(BYREF Number : INTEGER)
    Number ← Number + 1
ENDPROCEDURE

CALL AddOne(5)`,
    expectedErrorIncludes: ['BYREF argument 1'],
  },
  {
    id: 'error-record-unknown-field',
    title: 'Error: record unknown field',
    code: `TYPE StudentRecord
    DECLARE Name : STRING
ENDTYPE

DECLARE Student : StudentRecord
OUTPUT Student.Score`,
    expectedErrorIncludes: ['has no field'],
  },
]
