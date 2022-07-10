export const run = <T>(cb: () => T) => cb();

export const split = <T>(array: T[], predicate: (value: T) => boolean) => {
  const positive: T[] = [];
  const negative: T[] = [];
  for (const el of array) (predicate(el) ? positive : negative).push(el);
  return [positive, negative];
};

export const mapObject = <K extends string, V, K2 extends string, V2>(
  object: Record<K, V>,
  fn: (t: [k: K, v: V]) => [K2, V2],
) =>
  Object.fromEntries(
    Object.entries(object).map(([key, v]) => fn([key as K, v as V])),
  ) as Record<K2, V2>;

export const mapObjectValue = <K extends string, V, R>(
  object: Record<K, V>,
  fn: (v: V) => R,
) => {
  const result = {} as Record<K, R>;
  for (const key in object) {
    result[key] = fn(object[key]);
  }
  return result;
};
