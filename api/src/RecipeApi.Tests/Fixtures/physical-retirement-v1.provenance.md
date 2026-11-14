# Physical retirement V1 observations

`physical-retirement-old-v1.json` contains exact bytes from a completed real
physical retirement produced on unchanged old owners at commit
`6a0850700507afb8e3be1184cc79ca33bbadb4f9`. The test used the real canonical
Convert and RecipeService deletion seams in isolated PostgreSQL. It retained an
actual V1 canonical operation and original recipe/hash/receipt before the cascade.
It contains no later `foodMappingEvidence` column.
Its 8300 bytes have SHA256
`72aab55552cbbdd72c7d546d0eef5f779e67d4f6400fb18f494135f87debf062`.
The generator passed one PostgreSQL test, zero skips, in invocation
`.task/database-tests/runs/e9d9bc3810f7455d99e031863800300a/result.json`.
A prior source-first EF InMemory run passed independently and retains its own
host wire under the task directory. The first PostgreSQL attempt lacked the
fixture's extension/schema setup and failed before execution. The succeeding
run used the existing isolated database fixture and preserved that failure.

`physical-retirement-core-v1.json` contains exact bytes from the current core's
transitional physical V1 writer before its explicit V2 repair. It retained an
actual mapped canonical V2 operation and the explicit food evidence observation.
Its 16,226 bytes have SHA256
`823bb2d7530d24640d4c234b6994505effee390f20cdb8a3c60a191ebc2cd54a`.
The temporary export ran before the meaningful current-writer version RED.
Its original record and generating test source are retained under the same task
owner as `physical-core-v1-original.json` and
`physical-transition-generator-test.cs`. The export is absent from delivered tests.

Both fixtures are synthetic. No wrapper version, original payload, hash, ID or
receipt was rewritten to manufacture old authority. Current tests preserve exact
old bytes. New physical payload V2 requires the explicit evidence member including
null. Historical V1 omission is accepted only with consistent unmapped originals.
