# s59 — V9 Regression Bundle

Validate that the V9 smoke suite is registered and remains offline/static.

- Registered V9-era scenarios have scenario directories and `run.sh` files, including s61/s62/s63 even when their directories live under later version folders.
- Existing `tests/scenarios/v9/s*` directories have `run.sh` files and are registered in `tests/run_regression.py`.
- V9 scenario scripts avoid real OpenCode/OpenAI network/runtime dependencies.
- README documents the current 36-command docs IA and command overview.
