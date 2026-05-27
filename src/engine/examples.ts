type ExampleProgram = {
  name: string
  code: string
  inputText?: string
  expectedOutput: string[]
  expectedErrors?: string[]
  skipExactOutput?: boolean
}

export const examplePrograms: ExampleProgram[] = [
  {
    name: 'String slicing functions',
    code: `OUTPUT LENGTH("Hello")
OUTPUT LEFT("Cambridge", 3)
OUTPUT RIGHT("Cambridge", 4)
OUTPUT MID("Cambridge", 2, 3)`,
    expectedOutput: ['5', 'Cam', 'idge', 'amb'],
  },
  {
    name: 'Case and number functions',
    code: `OUTPUT UCASE("Hello")
OUTPUT LCASE("Hello")
OUTPUT INT(3.8)
OUTPUT INT(-3.8)
OUTPUT ROUND(3.6)
OUTPUT ROUND(3.14159, 2)`,
    expectedOutput: ['HELLO', 'hello', '3', '-3', '4', '3.14'],
  },
  {
    name: 'Functions in expressions',
    code: `DECLARE Size : INTEGER
Size ← LENGTH("Hello")
OUTPUT Size
OUTPUT LENGTH("Hello") + 5
OUTPUT UCASE("yes") = "YES"`,
    expectedOutput: ['5', '10', 'TRUE'],
  },
  {
    name: 'Functions with arrays',
    code: `DECLARE Names : ARRAY[1:3] OF STRING
DECLARE I : INTEGER

Names[1] ← "Tom"
Names[2] ← "Anna"
Names[3] ← "Christopher"

FOR I ← 1 TO 3
    OUTPUT Names[I], " length=", LENGTH(Names[I])
NEXT I`,
    expectedOutput: ['Tom length=3', 'Anna length=4', 'Christopher length=11'],
  },
  {
    name: 'RANDOMBETWEEN range',
    code: `DECLARE Number : INTEGER
Number ← RANDOMBETWEEN(1, 6)
OUTPUT Number >= 1 AND Number <= 6`,
    expectedOutput: ['TRUE'],
  },
  {
    name: 'Unknown function',
    code: `OUTPUT REVERSE("Hello")`,
    expectedOutput: [],
    expectedErrors: ["Line 1: Unknown function 'REVERSE'."],
  },
  {
    name: 'Function argument type error',
    code: `OUTPUT LENGTH(123)`,
    expectedOutput: [],
    expectedErrors: ['Line 1: LENGTH expects argument 1 to be STRING.'],
  },
  {
    name: 'Phase 8 two-dimensional array',
    code: `DECLARE Grid : ARRAY[1:2, 1:3] OF INTEGER
Grid[1, 1] ← 11
OUTPUT Grid[1, 1]`,
    expectedOutput: ['11'],
  },
]
