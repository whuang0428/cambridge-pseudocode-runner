export type GalleryExampleLevel = 'IGCSE' | 'A_LEVEL' | 'BOTH'

export type GalleryExample = {
  id: string
  title: string
  level: GalleryExampleLevel
  category: string
  description: string
  code: string
  input?: string
  expectedOutput?: string[]
}

export const galleryExamples: GalleryExample[] = [
  {
    id: 'basic-output',
    title: 'Basic Output',
    level: 'BOTH',
    category: 'Basics',
    description: 'Declare a string variable and output a greeting.',
    code: `DECLARE Name : STRING
Name ← "Tom"
OUTPUT "Hello ", Name`,
    expectedOutput: ['Hello Tom'],
  },
  {
    id: 'if-statement',
    title: 'If Statement',
    level: 'BOTH',
    category: 'Selection',
    description: 'Read a score and choose between pass and fail output.',
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
    title: 'For Loop Total',
    level: 'BOTH',
    category: 'Iteration',
    description: 'Use a counted loop to add the numbers from 1 to 5.',
    code: `DECLARE I : INTEGER
DECLARE Total : INTEGER

Total ← 0

FOR I ← 1 TO 5
    Total ← Total + I
NEXT I

OUTPUT "Total: ", Total`,
    expectedOutput: ['Total: 15'],
  },
  {
    id: 'array-total',
    title: 'Array Total',
    level: 'BOTH',
    category: 'Arrays',
    description: 'Input array values, calculate their total, and output the average.',
    code: `DECLARE Scores : ARRAY[1:5] OF INTEGER
DECLARE I : INTEGER
DECLARE Total : INTEGER

Total ← 0

FOR I ← 1 TO 5
    INPUT Scores[I]
    Total ← Total + Scores[I]
NEXT I

OUTPUT "Total: ", Total
OUTPUT "Average: ", Total / 5`,
    input: `80
65
90
72
88`,
    expectedOutput: ['Total: 395', 'Average: 79'],
  },
  {
    id: 'linear-search',
    title: 'Linear Search',
    level: 'BOTH',
    category: 'Algorithms',
    description: 'Search a fixed array for an input target value.',
    code: `DECLARE Numbers : ARRAY[1:5] OF INTEGER
DECLARE I : INTEGER
DECLARE Target : INTEGER
DECLARE Found : BOOLEAN

Numbers[1] ← 12
Numbers[2] ← 7
Numbers[3] ← 25
Numbers[4] ← 9
Numbers[5] ← 18

INPUT Target
Found ← FALSE

FOR I ← 1 TO 5
    IF Numbers[I] = Target THEN
        Found ← TRUE
    ENDIF
NEXT I

IF Found THEN
    OUTPUT "Found"
ELSE
    OUTPUT "Not found"
ENDIF`,
    input: '25',
    expectedOutput: ['Found'],
  },
  {
    id: 'find-maximum',
    title: 'Find Maximum',
    level: 'BOTH',
    category: 'Algorithms',
    description: 'Track the largest value while scanning an array.',
    code: `DECLARE Scores : ARRAY[1:5] OF INTEGER
DECLARE I : INTEGER
DECLARE MaxScore : INTEGER

Scores[1] ← 80
Scores[2] ← 65
Scores[3] ← 90
Scores[4] ← 72
Scores[5] ← 88

MaxScore ← Scores[1]

FOR I ← 2 TO 5
    IF Scores[I] > MaxScore THEN
        MaxScore ← Scores[I]
    ENDIF
NEXT I

OUTPUT "Maximum: ", MaxScore`,
    expectedOutput: ['Maximum: 90'],
  },
  {
    id: 'bubble-sort',
    title: 'Bubble Sort',
    level: 'BOTH',
    category: 'Algorithms',
    description: 'Sort five values by repeatedly swapping adjacent items.',
    code: `DECLARE Numbers : ARRAY[1:5] OF INTEGER
DECLARE I : INTEGER
DECLARE J : INTEGER
DECLARE Temp : INTEGER

Numbers[1] ← 5
Numbers[2] ← 2
Numbers[3] ← 4
Numbers[4] ← 1
Numbers[5] ← 3

FOR I ← 1 TO 4
    FOR J ← 1 TO 5 - I
        IF Numbers[J] > Numbers[J + 1] THEN
            Temp ← Numbers[J]
            Numbers[J] ← Numbers[J + 1]
            Numbers[J + 1] ← Temp
        ENDIF
    NEXT J
NEXT I

FOR I ← 1 TO 5
    OUTPUT Numbers[I]
NEXT I`,
    expectedOutput: ['1', '2', '3', '4', '5'],
  },
  {
    id: 'function-grade',
    title: 'Function Grade',
    level: 'A_LEVEL',
    category: 'Functions',
    description: 'Return a grade message from a function using CASE labels.',
    code: `FUNCTION GradeMessage(Score : INTEGER) RETURNS STRING
    CASE OF Score
        >= 80 : RETURN "High pass"
        >= 50 : RETURN "Pass"
        < 50 : RETURN "Fail"
    ENDCASE
ENDFUNCTION

DECLARE Score : INTEGER
INPUT Score

OUTPUT GradeMessage(Score)`,
    input: '85',
    expectedOutput: ['High pass'],
  },
  {
    id: 'procedure-swap',
    title: 'Procedure Swap',
    level: 'A_LEVEL',
    category: 'Procedures',
    description: 'Swap two variables with a BYREF procedure.',
    code: `PROCEDURE Swap(BYREF A : INTEGER, BYREF B : INTEGER)
    DECLARE Temp : INTEGER
    Temp ← A
    A ← B
    B ← Temp
ENDPROCEDURE

DECLARE X : INTEGER
DECLARE Y : INTEGER

X ← 3
Y ← 7

CALL Swap(X, Y)

OUTPUT "X = ", X
OUTPUT "Y = ", Y`,
    expectedOutput: ['X = 7', 'Y = 3'],
  },
  {
    id: 'record-array',
    title: 'Record Array',
    level: 'A_LEVEL',
    category: 'Records',
    description: 'Store records in an array and calculate a class average.',
    code: `TYPE StudentRecord
    DECLARE Name : STRING
    DECLARE Score : INTEGER
ENDTYPE

DECLARE Students : ARRAY[1:3] OF StudentRecord
DECLARE I : INTEGER
DECLARE Total : INTEGER

Total ← 0

Students[1].Name ← "Tom"
Students[1].Score ← 85
Students[2].Name ← "Anna"
Students[2].Score ← 92
Students[3].Name ← "Jack"
Students[3].Score ← 76

FOR I ← 1 TO 3
    OUTPUT Students[I].Name, " scored ", Students[I].Score
    Total ← Total + Students[I].Score
NEXT I

OUTPUT "Average: ", Total / 3`,
    expectedOutput: [
      'Tom scored 85',
      'Anna scored 92',
      'Jack scored 76',
      'Average: 84.33333333333333',
    ],
  },
  {
    id: 'virtual-file-read',
    title: 'Virtual File Read',
    level: 'A_LEVEL',
    category: 'Files',
    description: 'Write values to a virtual file, then read them back.',
    code: `DECLARE Number : INTEGER

OPENFILE "numbers.txt" FOR WRITE
WRITEFILE "numbers.txt", 10
WRITEFILE "numbers.txt", 20
WRITEFILE "numbers.txt", 30
CLOSEFILE "numbers.txt"

OPENFILE "numbers.txt" FOR READ
WHILE NOT EOF("numbers.txt")
    READFILE "numbers.txt", Number
    OUTPUT Number
ENDWHILE
CLOSEFILE "numbers.txt"`,
    expectedOutput: ['10', '20', '30'],
  },
  {
    id: 'string-characters',
    title: 'String Characters',
    level: 'BOTH',
    category: 'Strings',
    description: 'Loop through characters in a string and output ASC values.',
    code: `DECLARE Word : STRING
DECLARE I : INTEGER

Word ← "ABC"

FOR I ← 1 TO LENGTH(Word)
    OUTPUT Word[I], " = ", ASC(Word[I])
NEXT I`,
    expectedOutput: ['A = 65', 'B = 66', 'C = 67'],
  },
]
