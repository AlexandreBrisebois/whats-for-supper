# AWS Well-Architected Framework — Pillars Reference

Six pillars. Every architectural recommendation maps to at least one. Tag recommendations with the pillar abbreviation.

---

## OE — Operational Excellence

**Goal:** Run and monitor systems to deliver business value and continually improve processes.

**Key principles:**
- **Perform operations as code:** Use Infrastructure as Code (IaC) for everything (e.g., Cloud Development Kit (CDK), CloudFormation) and avoid manual changes ("click-ops").
- Make frequent, small, reversible changes.
- Anticipate failure — use "Chaos Engineering" (simulating failures) and "Pre-mortems".
- Learn from operational events — use structured runbooks and post-mortems (reviews after an incident).

**Questions to ask:**
- How will you deploy changes? (CI/CD pipeline required, not manual console pushes)
- How will you know when something is broken? (CloudWatch alarms, X-Ray tracing)
- What's your rollback strategy?

**Anti-patterns:**
- Manual deployments via AWS Console
- No deployment pipeline for infrastructure changes
- Alarms without runbooks
- Monolithic deployments with no canary or blue/green

---

## SEC — Security

**Goal:** Protect data, systems, and assets while delivering business value.

**Key principles:**
- **Apply Least-Privilege access:** Use Identity and Access Management (IAM) carefully everywhere — no broad permissions (wildcards like `*`) in production policies.
- **Enable traceability:** Use CloudTrail in all accounts, enable GuardDuty (threat detection), and aggregate findings in Security Hub.
- **Protect data at rest and in transit:** Use Key Management Service (KMS) for sensitive data and Transport Layer Security (TLS/HTTPS) everywhere.
- **Automate security response:** Use EventBridge rules that respond automatically to GuardDuty findings.
- **Keep people away from data:** No direct database access in production; use Systems Manager Session Manager instead of Secure Shell (SSH).

**Questions to ask:**
- Are you storing PII or sensitive data? (shapes encryption and access control decisions)
- Who needs access to production? (principle of least privilege, no shared root accounts)
- What's your secrets strategy? (AWS Secrets Manager for credentials, SSM Parameter Store for config)

**Anti-patterns:**
- Long-lived IAM access keys for automation (use OpenID Connect (OIDC) or instance roles instead).
- Wildcards in IAM policies.
- Secrets in environment variables or code.
- Root account used for daily operations.
- No Multi-Factor Authentication (MFA) on the management account.

**Day-one security baseline:**
- Enable CloudTrail (all regions, all accounts).
- Enable GuardDuty (threat detection).
- Enable AWS Config (resource tracking).
- Create an IAM password policy.
- Enable Multi-Factor Authentication (MFA) on root and all administrator users.
- Create a "Break-glass" IAM role for emergencies, not for daily use.

---

## REL — Reliability

**Goal:** Recover from failures and meet demand.

**Key principles:**
- Test recovery procedures — run game days, not just DR plans on paper
- Automatically recover from failure — use health checks, Auto Scaling, Lambda retries
- Scale horizontally — prefer many small resources over one large one
- Stop guessing capacity — use auto scaling and on-demand services

**Questions to ask:**
- What's your **Recovery Time Objective (RTO)**? (How long can you afford to be down?)
- What's your **Recovery Point Objective (RPO)**? (How much data can you afford to lose?)
- Which components are single points of failure?

**Reliability tiers (match to RTO/RPO):**

| Tier | RTO | Approach | Cost |
|---|---|---|---|
| Basic | Hours | Single-AZ, manual recovery | Low |
| Standard | Minutes | Multi-AZ, Auto Scaling | Medium |
| High | Seconds | Multi-region active-passive | High |
| Critical | Near-zero | Multi-region active-active | Very high |

**Anti-patterns:**
- **Multi-Availability Zone (Multi-AZ)** for development or staging (wasteful — save it for production).
- Multi-region Active-Active setups without a concrete RTO requirement of less than 1 minute.
- No retry logic on Lambda functions or Step Functions.
- **Simple Queue Service (SQS)** without a Dead-Letter Queue (DLQ).

---

## PERF — Performance Efficiency

**Goal:** Use resources efficiently to meet requirements, and maintain efficiency as demand changes and technologies evolve.

**Key principles:**
- Use serverless and managed services to remove undifferentiated heavy lifting
- Go global in minutes — CloudFront, Global Accelerator for latency-sensitive workloads
- Use the right tool for the job — don't use a relational DB for a key-value access pattern
- Experiment frequently — benchmark before and after changes

**Questions to ask:**
- What are the latency requirements? (p50, p99 — not just averages)
- What's the access pattern for your data? (key-value → DynamoDB, analytical → Athena/Redshift)
- Is this CPU-bound or I/O-bound? (shapes Lambda memory, container sizing)

**Anti-patterns:**
- Lambda with only 128MB of memory for CPU-intensive work (memory allocation directly affects CPU power).
- Synchronous API calls for asynchronous workflows (use SQS or EventBridge instead).
- Relational Database Service (RDS) for a purely key-value access pattern (use DynamoDB instead).
- No caching layer when the same data is read repeatedly (use ElastiCache, DynamoDB DAX, or CloudFront).

---

## COST — Cost Optimization

**Goal:** Avoid unnecessary costs.

**Key principles:**
- Adopt a consumption model — pay only for what you use
- Measure overall efficiency — cost per transaction, not just total spend
- Stop spending money on undifferentiated heavy lifting — use managed services
- Analyze and attribute expenditure — tagging, cost allocation, team accountability

**Questions to ask:**
- What's the monthly budget ceiling?
- Who owns cost accountability? (team-level tagging strategy)
- Which resources run 24/7 vs on-demand?

**Cost governance defaults:**
- AWS Budgets alert at 80% of monthly ceiling (hard stop at 100%)
- Mandatory resource tags: `env`, `team`, `workload`, `cost-center`
- Cost Explorer enabled from day one
- Scheduled Lambda / ECS tasks off during off-hours in dev

See [cost-conscious.md](cost-conscious.md) for detailed cost governance patterns.

**Anti-patterns:**
- **NAT Gateway** for non-sensitive outbound traffic (use Virtual Private Cloud (VPC) Endpoints or a public subnet instead).
- Provisioned DynamoDB capacity when traffic is unpredictable (use "On-Demand" mode).
- Always-on RDS in development or staging (use Aurora Serverless v2 or schedule it to stop/start).
- Lambda reserved concurrency set too high "just in case".
- Data transfer between Availability Zones (AZs) for non-critical traffic.

---

## SUS — Sustainability

**Goal:** Minimize environmental impact of running cloud workloads.

**Key principles:**
- Understand your impact — use the Customer Carbon Footprint Tool
- Maximize utilization — rightsized resources waste less energy
- Anticipate and adopt more efficient hardware — Graviton (ARM) instances offer better perf/watt
- Use managed services — AWS manages server utilization at scale more efficiently than you can

**Practical actions:**
- Default to Graviton (ARM) Lambda and ECS tasks — same or better performance, lower cost, lower energy
- Shut down dev/staging environments outside business hours
- Prefer serverless (Lambda, Fargate) over always-on EC2 for variable workloads
- Store data in S3 Intelligent-Tiering to automatically move cold data to cheaper, lower-energy storage

**Anti-patterns:**
- Always-on EC2 at <20% CPU utilization
- x86 by default when Graviton is available and compatible
- Storing all data in S3 Standard regardless of access frequency
