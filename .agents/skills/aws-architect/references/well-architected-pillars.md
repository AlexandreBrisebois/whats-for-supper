# AWS Well-Architected Framework — Pillars Reference

Six pillars. Every architectural recommendation maps to at least one. Tag recommendations with the pillar abbreviation.

---

## OE — Operational Excellence

**Goal:** Run and monitor systems to deliver business value and continually improve processes.

**Key principles:**
- Perform operations as code (IaC everything — CDK, CloudFormation, no click-ops)
- Make frequent, small, reversible changes
- Anticipate failure — use chaos engineering and pre-mortems
- Learn from operational events — structured runbooks, post-mortems

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
- Apply least-privilege IAM everywhere — no `*` actions, no `*` resources in production policies
- Enable traceability — CloudTrail in all accounts, GuardDuty enabled, Security Hub aggregated
- Protect data at rest and in transit — KMS for sensitive data, TLS everywhere
- Automate security response — EventBridge rules that respond to GuardDuty findings
- Keep people away from data — no direct DB access in prod; use Systems Manager Session Manager, not SSH

**Questions to ask:**
- Are you storing PII or sensitive data? (shapes encryption and access control decisions)
- Who needs access to production? (principle of least privilege, no shared root accounts)
- What's your secrets strategy? (AWS Secrets Manager for credentials, SSM Parameter Store for config)

**Anti-patterns:**
- Long-lived IAM access keys for automation (use OIDC / instance roles instead)
- Wildcards in IAM policies
- Secrets in environment variables or code
- Root account used for daily operations
- No MFA on the management account

**Day-one security baseline:**
- Enable CloudTrail (all regions, all accounts)
- Enable GuardDuty
- Enable AWS Config
- Create IAM password policy
- Enable MFA on root and all admin users
- Create a break-glass IAM role (not daily-use admin)

---

## REL — Reliability

**Goal:** Recover from failures and meet demand.

**Key principles:**
- Test recovery procedures — run game days, not just DR plans on paper
- Automatically recover from failure — use health checks, Auto Scaling, Lambda retries
- Scale horizontally — prefer many small resources over one large one
- Stop guessing capacity — use auto scaling and on-demand services

**Questions to ask:**
- What's your RTO? (Recovery Time Objective — how long can you be down?)
- What's your RPO? (Recovery Point Objective — how much data can you lose?)
- Which components are single points of failure?

**Reliability tiers (match to RTO/RPO):**

| Tier | RTO | Approach | Cost |
|---|---|---|---|
| Basic | Hours | Single-AZ, manual recovery | Low |
| Standard | Minutes | Multi-AZ, Auto Scaling | Medium |
| High | Seconds | Multi-region active-passive | High |
| Critical | Near-zero | Multi-region active-active | Very high |

**Anti-patterns:**
- Multi-AZ for dev/staging (waste — save it for prod)
- Multi-region active-active without a concrete RTO < 1 minute requirement
- No retry logic on Lambda or Step Functions
- SQS without DLQ

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
- Lambda with 128MB for CPU-intensive work (memory = CPU allocation)
- Synchronous API calls for async workflows (use SQS/EventBridge)
- RDS for a purely key-value access pattern
- No caching layer when the same data is read repeatedly (ElastiCache, DynamoDB DAX, CloudFront)

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
- NAT Gateway for non-sensitive outbound traffic (use VPC endpoints or public subnet)
- Provisioned DynamoDB capacity when traffic is unpredictable
- Always-on RDS in dev/staging (use Aurora Serverless v2 or schedule stop/start)
- Lambda reserved concurrency set too high "just in case"
- Data transfer between AZs for non-critical traffic

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
