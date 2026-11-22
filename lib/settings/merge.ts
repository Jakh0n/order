// Three-way merge for forms that save many fields at once (Website editor).
// Pure — unit-tested in tests/unit/merge.test.ts.

/** Same value? Objects compare by content, key order ignored. */
export function same(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}

function stable(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v === undefined
        ? null
        : v,
  );
}

/**
 * base: what the form was loaded with; edited: what it submits; current: the database now.
 * - field not edited → not written (a newer value saved elsewhere survives)
 * - edited here and changed elsewhere to something else → conflict (nothing is saved)
 * - otherwise → written
 */
export function mergeEdits<T extends Record<string, unknown>>(
  base: T,
  edited: T,
  current: T,
): { patch: Partial<T>; conflicts: (keyof T)[]; kept: (keyof T)[] } {
  const patch: Partial<T> = {};
  const conflicts: (keyof T)[] = [];
  const kept: (keyof T)[] = [];
  for (const key of Object.keys(edited) as (keyof T)[]) {
    const changedHere = !same(edited[key], base[key]);
    const changedThere = !same(current[key], base[key]);
    if (!changedHere) {
      if (changedThere) kept.push(key);
    } else if (changedThere && !same(current[key], edited[key])) {
      conflicts.push(key);
    } else {
      patch[key] = edited[key];
    }
  }
  return { patch, conflicts, kept };
}
