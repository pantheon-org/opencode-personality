# Biome Configuration Rationale

This document explains the rationale behind opinionated Biome rules in this project.

## Rule Explanations

### noForEach - Avoid `.forEach()`

**Status**: Enabled (level: error)

**Rationale**: The `.forEach()` method is discouraged for several reasons:

1. **Debugging**: `forEach` callbacks can be harder to debug because the stack trace includes the `forEach`
   implementation details rather than the actual iteration
2. **Performance**: In some JavaScript engines, traditional `for` loops or `for...of` loops are more optimizable than
   `forEach`
3. **Early exit**: Cannot break out of a `forEach` loop easily (requires throwing an exception), whereas `for` and
   `for...of` support `break`
4. **Async/Await**: Using `async` callbacks with `forEach` is a common pitfall - it doesn't wait for promises to
   resolve, unlike a `for...of` loop with `await`

**Alternative Patterns**:

```typescript
// ❌ Avoid
items.forEach((item) => console.log(item));

// ✅ Use for...of instead
for (const item of items) {
  console.log(item);
}

// ✅ Or use reduce for transformations
const sum = items.reduce((acc, item) => acc + item.value, 0);
```

### noExcessiveCognitiveComplexity - Limit Function Complexity

**Status**: Enabled (level: error)

**Rationale**: Cognitive complexity measures how difficult code is to understand. This rule enforces a maximum
complexity of 15 per function.

**Why 15?**

- Based on academic research suggesting human short-term memory can hold about 7±2 items
- Functions with complexity above 15 are significantly harder to maintain and test
- High complexity correlates with higher defect rates

**Complexity Factors**:

- Each `if`, `else if`, `else` statement
- Each loop (`for`, `while`, `do while`)
- Each `switch` case
- Each `catch` block
- Each ternary operator (`?:`)
- Each logical operator (`&&`, `||`) in conditions

**Reducing Complexity**:

```typescript
// ❌ High complexity (too many branches)
function processOrder(order: Order): Result {
  if (!order) return { error: "No order" };
  if (!order.items) return { error: "No items" };
  if (order.items.length === 0) return { error: "Empty items" };

  let total = 0;
  for (const item of order.items) {
    if (!item.price) continue;
    if (item.discount) {
      if (item.discount.type === "percent") {
        total += item.price * (1 - item.discount.value);
      } else if (item.discount.type === "fixed") {
        total += item.price - item.discount.value;
      }
    } else {
      total += item.price;
    }
  }

  if (order.coupon) {
    if (order.coupon.type === "percent") {
      total *= 1 - order.coupon.value;
    } else {
      total -= order.coupon.value;
    }
  }

  return { total };
}

// ✅ Extract into smaller functions
function validateOrder(order: Order): ValidationResult {
  if (!order) return { error: "No order" };
  if (!order.items) return { error: "No items" };
  if (order.items.length === 0) return { error: "Empty items" };
  return { valid: true };
}

function calculateItemPrice(item: OrderItem): number {
  if (!item.price) return 0;
  if (!item.discount) return item.price;

  return item.discount.type === "percent" ? item.price * (1 - item.discount.value) : item.price - item.discount.value;
}

function applyCoupon(total: number, coupon: Coupon): number {
  return coupon.type === "percent" ? total * (1 - coupon.value) : total - coupon.value;
}

function processOrder(order: Order): Result {
  const validation = validateOrder(order);
  if ("error" in validation) return validation;

  const total = order.items!.reduce((sum, item) => sum + calculateItemPrice(item), 0);

  return order.coupon ? { total: applyCoupon(total, order.coupon) } : { total };
}
```

### useArrowFunction - Prefer Arrow Functions

**Status**: Enabled (level: error)

**Rationale**: This enforces the project's coding style to use arrow functions consistently.

**Benefits**:

1. **Lexical `this`**: Arrow functions don't have their own `this`, avoiding common binding issues
2. **Concise syntax**: Shorter, especially for single-expression functions
3. **Consistency**: Uniform function syntax throughout the codebase
4. **Type inference**: Better TypeScript type inference in some cases

### Other Notable Rules

- **style.noVar**: Use `let` or `const` instead of `var` (prevents hoisting issues)
- **style.useConst**: Use `const` for variables that are never reassigned (immutability by default)
- **suspicious.noDoubleEquals**: Use strict equality (`===`) to avoid type coercion bugs
- **complexity.noUselessTernary**: Avoid unnecessary ternary expressions
- **performance.noDelete**: Avoid `delete` operator (de-optimizes objects in V8)

## Configuration

See `biome.json` for the full configuration. Rules are categorized into:

- `recommended`: true - Industry best practices
- `style`: Project-specific style rules
- `complexity`: Cognitive complexity and code simplicity rules
- `performance`: Performance optimization rules
- `suspicious`: Likely bug patterns

## Running Biome

```bash
# Check all files
bun run lint

# Fix auto-fixable issues
bun run lint:fix

# Format code
bun run format
```
