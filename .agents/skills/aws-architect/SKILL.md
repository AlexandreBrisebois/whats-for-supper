---
name: aws-well-architected
description: Review or change WFS AWS architecture, CDK infrastructure or AWS deployment workflows when those are in the selected scope. Not general CI, NAS deployment or mandatory startup guidance.
metadata:
  version: "1.1.0"
---

# WFS AWS architecture

This directory retains discovery name `aws-well-architected`. Reuse the selected
scope and known constraints; ask only about consequential missing workload, cost or
recovery requirements. Shared authority and execution policy remain in
[AGENT.md](../../../AGENT.md), not a separate AWS interview or completion protocol.

Start with the affected source in [infrastructure/aws](../../../infrastructure/aws)
and [.github/workflows/aws-deploy.yml](../../../.github/workflows/aws-deploy.yml).
The current C# CDK stack wires networking, storage, database, migration, backend,
frontend and routing constructs. Verify their current relationships before proposing
a service substitution. The workflow uses manual dispatch and OIDC; a workflow file
or successful synth is not evidence of live deployment or approval settings.

Load only the reference needed for the actual decision:

| Decision | Reference |
|---|---|
| Existing WFS deployment pipeline and OIDC | [GitHub Actions](references/cicd-github-actions.md) |
| Lambda backend | [Lambda](references/cicd-targets/lambda.md) |
| Explicit container-hosting alternative | [ECS](references/cicd-targets/ecs-fargate.md) |
| Explicit static-asset hosting question | [S3/CloudFront](references/cicd-targets/s3-cloudfront.md) |
| CDK changes and synthesized effects | [CDK](references/cicd-targets/iac-cdk.md) |
| Account/organization boundaries | [Landing zone](references/landing-zone.md) |
| Service tradeoffs | [Service selection](references/service-selection.md) |
| Budget/cost analysis | [Cost](references/cost-conscious.md) |
| Architecture review dimensions | [Pillars](references/well-architected-pillars.md) |

Reference templates are illustrative, not installed WFS configuration. Verify current
provider documentation, regional availability, pricing and action/package versions
when a selected AWS task depends on them. Match capacity and resilience to documented
load/recovery needs; do not assume a serverless rewrite or multi-account rollout.
Report source/config evidence, estimated versus measured cost, and actual validation.
