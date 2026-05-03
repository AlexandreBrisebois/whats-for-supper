# Cost-Conscious AWS Design

Cost optimization is a first-class architectural concern — not something you retrofit after launch.

---

## Tagging Strategy

Enforce mandatory tags from day one. Tags are the foundation of cost attribution, automation, and governance.

**Mandatory tags:**

| Tag Key | Example Values | Purpose |
|---|---|---|
| `env` | `prod`, `staging`, `dev`, `sandbox` | Environment isolation |
| `team` | `platform`, `api`, `data`, `ml` | Team cost attribution |
| `workload` | `supper-api`, `bedrock-agent`, `data-pipeline` | Workload-level cost tracking |
| `cost-center` | `engineering`, `ai-products` | Finance chargeback |

**Enforcement options:**
- AWS Config rule `required-tags`: detects untagged resources
- SCP to deny resource creation without required tags (aggressive — test in sandbox first)
- Tag policies (AWS Organizations): normalize tag values, detect non-conformance

**CDK tagging pattern:**
```typescript
// Apply to entire stack
Tags.of(app).add('env', props.environment);
Tags.of(app).add('team', 'platform');
Tags.of(app).add('workload', 'my-service');
Tags.of(app).add('cost-center', 'engineering');
```

---

## AWS Budgets

Set up budgets before you deploy anything. Surprises on the AWS bill are avoidable.

**Recommended budget setup:**

1. **Account-level monthly budget** — alert at 80%, action (SCP or email) at 100%
2. **Per-workload budget** — filter by `workload` tag, alert at 80%
3. **Anomaly detection** — AWS Cost Anomaly Detection (free) — alerts on unexpected spend spikes

**CDK snippet:**
```typescript
import * as budgets from 'aws-cdk-lib/aws-budgets';

new budgets.CfnBudget(this, 'MonthlyBudget', {
  budget: {
    budgetType: 'COST',
    timeUnit: 'MONTHLY',
    budgetLimit: { amount: 500, unit: 'USD' },
    costFilters: { TagKeyValue: ['user:workload$my-service'] },
  },
  notificationsWithSubscribers: [{
    notification: {
      comparisonOperator: 'GREATER_THAN',
      notificationType: 'ACTUAL',
      threshold: 80,
      thresholdType: 'PERCENTAGE',
    },
    subscribers: [{ address: 'team@example.com', subscriptionType: 'EMAIL' }],
  }],
});
```

---

## Common Cost Traps

### NAT Gateway
- **Cost:** ~$32/month per AZ + $0.045/GB processed
- **Fix:** Use VPC Interface Endpoints for AWS service traffic (S3, DynamoDB, SSM, ECR, Secrets Manager). Each endpoint ~$7.20/month — cheaper than NAT once data volume is moderate.
- **Better fix for Lambda-heavy workloads:** Don't put Lambda in a VPC unless it needs to reach a private resource (RDS, ElastiCache). Lambda calling AWS APIs doesn't need VPC.

### Data Transfer
- **Intra-AZ:** Free within the same AZ
- **Inter-AZ:** $0.01/GB each way — adds up with microservices chatting across AZs
- **Internet egress:** $0.09/GB (first 10TB) — use CloudFront to reduce egress costs for public content
- **Fix:** Prefer same-AZ communication in hot paths; use CloudFront for public assets

### RDS in Dev/Staging
- **Cost:** db.t3.small Multi-AZ = ~$50/month — wasted when no one is using it at night
- **Fix options:**
  - Aurora Serverless v2: scales to 0 ACU when idle (not quite zero, but close — ~$43/month minimum)
  - RDS scheduled stop/start via EventBridge: turn off at 7pm, on at 8am (saves ~65% of compute cost)
  - Use DynamoDB or SQLite-backed local tests to avoid RDS in dev entirely

### Lambda Concurrency
- **Trap:** Setting reserved concurrency too high wastes nothing (Lambda is pay-per-use), but setting provisioned concurrency unnecessarily adds ~$0.015/hour per provisioned instance
- **Fix:** Only use provisioned concurrency when you have measured cold start latency causing p99 SLA violations

### S3 Request Costs
- **Trap:** Frequent small GETs to S3 from Lambda on every invocation
- **Fix:** Cache in Lambda memory (module-level) for config/reference data; use SSM Parameter Store for config

### EventBridge vs SQS
- **EventBridge:** $1/million events after the free tier
- **SQS:** $0.40/million requests (first 1M free)
- **Fix:** Use SQS for point-to-point; EventBridge only when you need routing rules or cross-account fan-out

---

## Compute Savings

### Lambda
- **Memory right-sizing:** Use [AWS Lambda Power Tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning) before committing to a memory setting. Often 512MB runs faster *and* cheaper than 128MB due to proportional CPU allocation.
- **Architecture:** Graviton2 (arm64) Lambda = same or better performance at 20% lower cost. Default to `architecture: lambda.Architecture.ARM_64` in CDK.

```typescript
new lambda.Function(this, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_22_X,
  architecture: lambda.Architecture.ARM_64, // 20% cheaper, same or better perf
  memorySize: 512, // tune with Power Tuning tool
  // ...
});
```

### ECS Fargate
- **Graviton:** Fargate on ARM64 is 20% cheaper. Use `cpuArchitecture: ecs.CpuArchitecture.ARM64`.
- **Spot:** Fargate Spot is 70% cheaper — use for non-critical, interruptible workloads (batch processing, dev environments)

```typescript
new ecs.FargateTaskDefinition(this, 'TaskDef', {
  runtimePlatform: {
    cpuArchitecture: ecs.CpuArchitecture.ARM64,
    operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
  },
});
```

### Savings Plans
- **Compute Savings Plans:** Commit to a $/hour spend level (not specific instance types) — applies to Lambda, Fargate, and EC2. 1-year no-upfront = ~17% savings. 3-year all-upfront = ~50%.
- **When to buy:** After 1-2 months of stable production spend. Never buy upfront for a new workload.

---

## Dev Environment Cost Controls

| Control | Savings |
|---|---|
| Stop RDS instances outside business hours (EventBridge) | ~65% |
| Delete unused NAT Gateways in dev VPCs | $32+/month |
| Use DynamoDB on-demand in dev (no provisioned capacity) | Variable |
| Lambda: no reserved or provisioned concurrency in dev | $0 baseline |
| ECS: scale to 0 tasks at night with Application Auto Scaling | ~65% |
| S3: use Intelligent-Tiering for dev data | ~40% on cold data |

---

## Cost Review Cadence

- **Weekly:** Check Cost Explorer for anomalies (or enable Cost Anomaly Detection)
- **Monthly:** Review per-workload budget vs actual, right-size anything > 80% budget
- **Quarterly:** Run AWS Compute Optimizer recommendations, review Savings Plans coverage
