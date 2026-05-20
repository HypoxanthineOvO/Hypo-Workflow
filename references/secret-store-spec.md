# Secret Store Projection Spec

Raw secret values live outside project projections, normally in `~/.hypo-workflow/secrets.yaml`, environment variables, or another local credential store.

Derived secret capability projections expose metadata only:

- `id`
- `provider`
- `kind`
- `scope`
- `capabilities`
- `allowed_for`
- `dependent_projects`
- `health.status`
- `health.checked_at`
- `redaction_policy`
- `secret_ref.store_ref`
- `secret_ref.metadata_only`
- `evidence_refs`

Projection output must not include raw credential field names or values, including `raw_value`, `value`, `token`, `api_key`, `password`, `authorization`, `access_token`, `refresh_token`, or `client_secret`.

Health checks may record status and timestamp, but response excerpts and authorization headers are not projectable.

Notion-projectable summaries may include metadata-only secret refs when a capability is relevant to sync or publishing, but they must not copy the raw secret store.
