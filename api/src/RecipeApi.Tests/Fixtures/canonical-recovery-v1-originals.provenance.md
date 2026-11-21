# Historical recovery canonical originals

`canonical-recovery-v1-originals.json` contains the exact 11,067-byte output of
`CurrentRecoveryCanonicalOperationTests.CheckOriginalsAsync` executed through
`CurrentRecoveryObligationsPostgresTests.ManagementInspection_RetainsOriginalCanonicalRequestsAndAllCreatedIdKindsWithoutPublication`
on unchanged V1 canonical/archive owners from commit
`6a0850700507afb8e3be1184cc79ca33bbadb4f9`.
SHA256 is `a2d3d6c9cf2b81c69cac25ad328ae18c0d7e3d2919545fca0b70e4941463deaa`.

The isolated generator added one test-only export after the actual Convert/Edit
operations. Its original roundtrip and all nine rehashed-divergence cases passed
in real PostgreSQL, with one test passed and zero skipped. The invocation record
is `.task/database-tests/runs/1665741f08b2493499a0d92cde34583e/result.json`.
Both requests retain the original private note. The edit allocated distinct
ingredient, section and step IDs and retained their complete original requests,
results and input hashes. No current V2 envelope was rewritten as V1.

The fixture qualifies historical archive validation and immutable readback.
Current V2 operations require the separately selected new archive format and
full recovery acceptance. Their rejection by historical archives is covered
explicitly. The original current-V2 positive roundtrip failure remains recorded
in the foundation verifier and motivates that separate recovery implementation.
