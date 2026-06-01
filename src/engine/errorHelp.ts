type HelpText = {
  reason: string
  suggestion: string
}

export function addFriendlyHelp(errors: string[]): string[] {
  return errors.map((error) => {
    if (error.includes('Possible reason:') || error.includes('Suggestion:')) return error

    const help = getHelpText(error)
    if (!help) return error

    return `${error}\nPossible reason: ${help.reason}\nSuggestion: ${help.suggestion}`
  })
}

function getHelpText(error: string): HelpText | null {
  const undeclared = error.match(/Variable '([^']+)' has not been declared\./)
  if (undeclared) {
    return {
      reason: `You used ${undeclared[1]} before declaring it.`,
      suggestion: `Add DECLARE ${undeclared[1]} : INTEGER, DECLARE ${undeclared[1]} : STRING, or another suitable type before using it.`,
    }
  }

  const variableTypeMismatch = error.match(/Cannot assign ([A-Z]+) to ([A-Z]+) variable '([^']+)'\./)
  if (variableTypeMismatch) {
    return {
      reason: 'The value type does not match the declared variable type.',
      suggestion: `Check the DECLARE line for ${variableTypeMismatch[3]}, or change the assigned value to ${articleFor(
        variableTypeMismatch[2],
      )} ${variableTypeMismatch[2]}.`,
    }
  }

  if (/Cannot assign [A-Z]+ to [A-Z]+ (array|field)/.test(error)) {
    return {
      reason: 'The value type does not match the declared type.',
      suggestion: 'Check the declaration for this array or record field, or change the assigned value to the correct type.',
    }
  }

  const inputType = error.match(/Cannot convert input '([^']*)' to ([A-Z]+)\./)
  if (inputType) {
    return {
      reason: inputType[2] === 'INTEGER'
        ? 'The program expected a whole number, but the input was not a valid INTEGER.'
        : `The program expected a ${inputType[2]} value, but the input could not be converted.`,
      suggestion: inputSuggestion(inputType[2]),
    }
  }

  if (error.includes('Division by zero.')) {
    return {
      reason: 'The right side of /, DIV, or MOD became 0.',
      suggestion: 'Check the value of the divisor before dividing.',
    }
  }

  if (error.includes('Missing ENDIF for IF statement.')) {
    return {
      reason: 'Every IF block must be closed.',
      suggestion: 'Add ENDIF after the statements inside the IF block.',
    }
  }

  if (error.includes('Missing NEXT for FOR statement.')) {
    return {
      reason: 'Every FOR loop must be closed.',
      suggestion: 'Add NEXT or NEXT counterName after the loop body.',
    }
  }

  if (error.includes('Missing ENDWHILE for WHILE statement.')) {
    return {
      reason: 'Every WHILE loop must be closed.',
      suggestion: 'Add ENDWHILE after the loop body.',
    }
  }

  if (error.includes('Missing UNTIL for REPEAT statement.')) {
    return {
      reason: 'Every REPEAT loop must end with an UNTIL condition.',
      suggestion: 'Add UNTIL condition after the repeated statements.',
    }
  }

  if (/Array .* out of bounds/.test(error)) {
    return {
      reason: 'You tried to access an array position outside its declared range.',
      suggestion: 'Check the ARRAY declaration and make sure the index is within the valid range.',
    }
  }

  if (/(Procedure|Function) '[^']+' expects \d+ arguments? but got \d+\./.test(error)) {
    const callableType = error.includes('Procedure') ? 'PROCEDURE' : 'FUNCTION'
    const useText = callableType === 'PROCEDURE' ? 'CALL' : 'function call'
    return {
      reason: `The ${useText} does not provide the same number of arguments as the ${callableType} definition.`,
      suggestion: `Check the parameter list in the ${callableType} definition and update the ${useText}.`,
    }
  }

  if (/Function '[^']+' ended without RETURN\./.test(error)) {
    return {
      reason: 'A FUNCTION must return a value.',
      suggestion: 'Add RETURN expression before ENDFUNCTION.',
    }
  }

  if (error.includes('Execution limit exceeded. Possible infinite loop.')) {
    return {
      reason: 'A loop or recursive call may never stop.',
      suggestion: 'Check whether your loop variable changes and whether the stopping condition can become TRUE.',
    }
  }

  return null
}

function inputSuggestion(type: string): string {
  if (type === 'INTEGER') return 'Enter a whole number such as 5 or -3.'
  if (type === 'REAL') return 'Enter a number such as 3.5 or -2.'
  if (type === 'BOOLEAN') return 'Enter TRUE or FALSE.'
  if (type === 'CHAR') return 'Enter exactly one character, such as A.'
  return 'Enter a value that matches the expected type.'
}

function articleFor(type: string): string {
  return type === 'INTEGER' ? 'an' : 'a'
}
