# Test traps

Three failures that pass the suite and fail in production.

- **An invented identifier breaks when validation cross-checks a second table.** The moment the parser requires the entry to name a real page or entity, the generic `example` fixture is invalid. Move it to a real key and add one negative case; do not weaken the check.
- **A hand-written framework shim limits which matchers a test may use.** A shim declaring only `toBe`, `toEqual` and `toThrow` makes `toBeDefined` a type error. Express the claim with what is declared, and leave the shim alone.
- **A stub that calls a completion callback inline reorders the writes a real worker makes.** Indexing output lines fails on the stub's order, or passes while the real order differs. Find each record by a field only its kind carries.
