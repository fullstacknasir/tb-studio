export const log = {
info: (...args: unknown[]) => console.log("[syncross]", ...args),
warn: (...args: unknown[]) => console.warn("[syncross]", ...args),
error: (...args: unknown[]) => console.error("[syncross]", ...args)
};