export function safeStringify(value: unknown, space = 2) {
  try {
    return JSON.stringify(
      value,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      space
    );
  } catch (err) {
    return `[Unserializable Object: ${String(err)}]`;
  }
}

export function safeLog(label: string, value: unknown) {
  console.log(label, safeStringify(value));
}

export function safeError(label: string, value: unknown) {
  console.error(label, safeStringify(value));
}
