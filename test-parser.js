// Quick test of the expression parser logic

const expression = "(2+3)*5";

console.log('Testing expression:', expression);

// Test 1: Valid characters
const validCharRegex = /^[\d+\-*/().\s]+$/;
const cleaned = expression.replace(/\s/g, '');
console.log('Cleaned:', cleaned);
console.log('Valid chars test:', validCharRegex.test(cleaned));

// Test 2: Balanced parentheses
function hasBalancedParentheses(expr) {
  let count = 0;
  for (const char of expr) {
    if (char === '(') count++;
    if (char === ')') count--;
    if (count < 0) return false;
  }
  return count === 0;
}
console.log('Balanced parens:', hasBalancedParentheses(cleaned));

// Test 3: Operator placement
const startEndOps = /^[+*/]|[+\-*/]$/.test(cleaned);
console.log('Start/end ops (should be false):', startEndOps);

const opAfterParen = /\([+*/]/.test(cleaned);
console.log('Op after ( (should be false):', opAfterParen);

const opBeforeParen = /[+\-*/]\)/.test(cleaned);
console.log('Op before ) (should be false):', opBeforeParen);

// Test 4: Valid numbers
function hasValidNumbers(expr) {
  const numberRegex = /\d+\.?\d*/g;
  const numbers = expr.match(numberRegex) || [];
  return numbers.every(num => (num.match(/\./g) || []).length <= 1);
}
console.log('Valid numbers:', hasValidNumbers(cleaned));

// Test 5: Operator sequence
const consecutiveOps = /[+*/]{2,}|[+*/]-[+*/]/g;
console.log('Consecutive ops (should be false):', consecutiveOps.test(cleaned));

// Test 6: Division by zero
const divByZero = /\/\s*0(?!\d)/.test(cleaned);
console.log('Div by zero (should be false):', divByZero);

console.log('\nAll tests should pass for this expression to be valid');
