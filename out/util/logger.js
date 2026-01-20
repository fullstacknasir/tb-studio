"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
exports.log = {
    info: (...args) => console.log("[syncross]", ...args),
    warn: (...args) => console.warn("[syncross]", ...args),
    error: (...args) => console.error("[syncross]", ...args)
};
//# sourceMappingURL=logger.js.map