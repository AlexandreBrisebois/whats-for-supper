import { createUntypedNodeFromDiscriminatorValue } from '@microsoft/kiota-abstractions';
import { JsonParseNode } from '@microsoft/kiota-serialization-json';
import type { RecipeIngredientLineInput, RecipeUnit, UpdateRecipeDto } from './generated/models';
import { normalizeGroceryQuantity } from './grocery-quantities';

const present = (fields: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
const unit = (value: RecipeUnit | null | undefined) =>
  value == null ? value : present({ text: value.text, definitionId: value.definitionId });

function quantity(value: RecipeIngredientLineInput['amount']) {
  if (value == null) return value;
  const exact = normalizeGroceryQuantity(value);
  if (exact?.kind === 'scalar' && 'value' in exact && exact.value)
    return { kind: 'scalar', value: present({ n: exact.value.n, d: exact.value.d }) };
  if (exact?.kind === 'range' && 'min' in exact && 'max' in exact && exact.min && exact.max)
    return {
      kind: 'range',
      min: present({ n: exact.min.n, d: exact.min.d }),
      max: present({ n: exact.max.n, d: exact.max.d }),
    };
  throw new Error('Canonical edit quantity has no exact wire representation.');
}

// The generated nullable quantity union serializes both scalar and range, writing
// kind twice. Untyped rows use Kiota's existing writer/adapter while preserving
// only the declared editable wire fields and exact string operands.
export function canonicalIngredientLinesForTransport(
  lines: UpdateRecipeDto['ingredientLines']
): UpdateRecipeDto['ingredientLines'] {
  return (
    lines?.map((line) => {
      const pack = line.packageEscaped;
      const wire = present({
        id: line.id,
        clientId: line.clientId,
        description: line.description,
        amount: quantity(line.amount),
        amountText: line.amountText,
        unit: unit(line.unit),
        scaling: line.scaling,
        package:
          pack == null
            ? pack
            : present({
                countUnit: unit(pack.countUnit),
                capacity:
                  pack.capacity == null
                    ? pack.capacity
                    : present({
                        amount: quantity(pack.capacity.amount),
                        unit: unit(pack.capacity.unit),
                      }),
                basis: pack.basis,
              }),
        shopping:
          line.shopping == null
            ? line.shopping
            : present({
                name: line.shopping.name,
                foodId: line.shopping.foodId,
                mappingRevision: line.shopping.mappingRevision,
              }),
      });
      return new JsonParseNode(wire).getObjectValue(
        createUntypedNodeFromDiscriminatorValue
      ) as RecipeIngredientLineInput;
    }) ?? lines
  );
}
