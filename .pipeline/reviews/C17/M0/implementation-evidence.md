# C17-M0 Implementation Evidence

## Scope

- Added root `package.json` with `private: true`, `type: module`, and `scripts.test`.
- Added `buildAuditInventory()` / `auditInventory()` production helper.
- Exported audit inventory from `core/src/index.js`.
- Did not edit test files or test evidence files.

## Changed Files

- `package.json`
- `core/src/audit-inventory/index.js`
- `core/src/index.js`
- `.pipeline/reviews/C17/M0/implementation-evidence.md`

## Audit Inventory Baseline Counts

```json
{
  "hardcoded_paths": 31,
  "duplicate_helpers": 14,
  "workspace_imports": 9,
  "yaml_parsers": 2,
  "ledger_rewrites": 137,
  "barrel_exports": 55
}
```

## Validation

- `node --test core/test/audit-baseline.test.js`: pass, 2 tests.
- `npm test`: pass, 633 tests.
- `git diff --check`: pass, no output.

## Notes

- The inventory helper scans bounded text targets: `core/src`, `scripts`, root README files, `docs`, and `references`.
- Heavy or unrelated directories such as `.git`, `node_modules`, `.pipeline`, archives, dist, coverage, and caches are skipped.
- M0 records baseline categories only; remediation remains for later C17 milestones.
