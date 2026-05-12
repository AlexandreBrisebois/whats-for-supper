# AWS Service Selection — Right Service for the Right Reason

Always start with the requirement, not the service name. Ask: "What problem are you solving?" before opening any decision tree.

---

## Compute

### Lambda vs ECS Fargate vs EC2

| Criterion | Lambda | Elastic Container Service (ECS) Fargate | Elastic Compute Cloud (EC2) |
|---|---|---|---|
| Max duration | 15 minutes | Unlimited | Unlimited |
| Startup latency | Cold start: 100ms–2s | Warm: fast; cold: 20-60s | Minutes |
| Packaging | ZIP or container (10GB) | Container image | Amazon Machine Image (AMI) |
| State | Stateless | Stateless (with EFS/EBS storage) | Stateful possible |
| Cost model | Per invocation + duration | Per vCPU and memory per second | Per hour |
| Operational burden | Lowest | Low | High |
| When to choose | Event-driven, short tasks, APIs | Long-running containers, scheduled jobs, websockets | Legacy lift-and-shift, specialized hardware (GPU), custom OS |

**Decision flow:**
1. Is the task event-driven or request-response with less than 15 minutes duration? → **Lambda**
2. Do you need a persistent process, WebSockets, or a custom runtime? → **ECS Fargate**
3. Do you need specialized hardware (GPU), a specific Operating System, or are you migrating an existing server as-is ("lifting-and-shifting")? → **EC2**

**App Runner** — consider for containerized APIs where you don't want to manage ECS clusters. Simpler than Fargate, less control. Good fit for small teams.

**Gold-plating check:** Don't reach for ECS/Fargate because "Lambda won't scale." Lambda scales to 1,000 concurrent executions by default and 10,000+ on request. Start with Lambda.

---

## API / Ingress

### API Gateway (HTTP API) vs API Gateway (REST API) vs Application Load Balancer (ALB) vs CloudFront Functions

| Option | Cost | Latency | Best for |
|---|---|---|---|
| API Gateway HTTP API | Approximately $1 per million requests | Low | Lambda backends, most API use cases |
| API Gateway REST API | Approximately $3.50 per million requests | Low | Usage plans, API keys, request caching, Web Application Firewall (WAF) integration |
| Application Load Balancer (ALB) | Hourly charge + LCU usage | Low | ECS or EC2 backends, gRPC, WebSockets |
| CloudFront Functions | Approximately $0.10 per million | Edge, very low | Simple request/response transformations at the CDN edge |

**Decision flow:**
1. Backend is Lambda and you don't need usage plans or WAF → **HTTP API** (70% cheaper than REST)
2. You need API keys, throttling per customer, WAF, or request caching → **REST API**
3. Backend is ECS, EC2, or containers → **Application Load Balancer (ALB)**
4. You need to transform or redirect traffic at the Content Delivery Network (CDN) edge → **CloudFront Functions**

---

## Data Storage

### DynamoDB vs Relational Database Service (RDS) vs Aurora vs S3 + Athena

| Option | Access pattern | Cost model | When to choose |
|---|---|---|---|
| DynamoDB (On-Demand) | Key-value, simple queries | Per request | High-throughput key-value, session stores, event stores |
| DynamoDB (Provisioned + Accelerator (DAX)) | Key-value, read-heavy | Per hour | Consistent high-throughput, microsecond reads |
| Relational Database Service (RDS) | Relational (MySQL/PostgreSQL), complex SQL | Per instance-hour | Relational data, complex joins, existing SQL applications |
| Aurora Serverless v2 | Relational | Per ACU per second | Variable workloads, development/staging, infrequent use |
| Simple Storage Service (S3) + Athena | Analytical, large datasets | Per query ($5 per Terabyte scanned) | Log analytics, data lakes, infrequent queries over large data |

**Decision flow:**
1. Access pattern is key-value or document-based? → **DynamoDB On-Demand**
2. Need complex SQL, joins, and ACID transactions? → **RDS PostgreSQL** (or Aurora Serverless v2 for variable loads)
3. Analytical queries over large datasets (Gigabytes to Terabytes)? → **S3 + Athena** (cheapest to start)
4. Frequent Business Intelligence (BI) or analytics with complex queries? → **Redshift Serverless**

**Gold-plating check:** Don't use Aurora Multi-Master or Global Database without a concrete RTO requirement. Aurora Serverless v2 in a single AZ is fine for dev and often for prod with tolerable RTO.

**Always-on cost warning:** RDS Single-AZ db.t3.micro = ~$13/month. RDS Multi-AZ db.t3.small = ~$50/month. Aurora Serverless v2 minimum ~$43/month at 0.5 ACU. Budget accordingly for dev environments.

---

## Messaging and Eventing

### SQS vs SNS vs EventBridge vs Kinesis

| Service | Pattern | Ordering | Consumers | When to choose |
|---|---|---|---|---|
| Simple Queue Service (SQS) | Point-to-point queue | Best-effort | 1 consumer group | Decoupling, retries, worker queues |
| SQS FIFO (First-In, First-Out) | Point-to-point, ordered | Strict | 1 consumer group | Order matters, deduplication required |
| Simple Notification Service (SNS) | Fan-out (Publish/Subscribe) | No | Many subscribers | Notify multiple consumers of the same event |
| EventBridge | Event bus and routing | No | Rules-based routing | Cross-service or cross-account event routing, scheduled rules |
| Kinesis Data Streams | Streaming, ordered per shard | Per shard | Multiple consumer groups | High-volume streaming, data replay, analytics pipelines |
| Kinesis Data Firehose | Delivery to S3 or Redshift | No | 1 destination | Ingesting logs or events directly to a data lake |

**Decision flow:**
1. One producer, one consumer, need retries and a Dead-Letter Queue (DLQ)? → **SQS**
2. One event, multiple consumers? → **SNS** (or SNS to SQS fan-out for durability)
3. Event routing between services/accounts, or scheduled events? → **EventBridge**
4. High-volume ordered streams, multiple readers, and replay capabilities needed? → **Kinesis**

**Cost warning:** Kinesis Data Streams charges per shard-hour ($0.015/shard/hour = ~$11/month per shard). Don't use Kinesis for < 1,000 events/second. SQS is near-free at low volumes.

---

## AI / ML

### Bedrock vs SageMaker vs Third-Party API

| Option | When to choose |
|---|---|
| Amazon Bedrock | Using foundation models (Claude, Titan, Llama) via API, no model training, AWS-native integration |
| SageMaker | Custom model training, fine-tuning, hosting your own models, MLOps pipelines |
| Third-party API (OpenAI, Anthropic direct) | Prototyping, or if Bedrock doesn't offer the model you need |

**Bedrock defaults:**
- Use Bedrock for Claude (Anthropic) models — same models, AWS billing, Identity and Access Management (IAM) authentication, and Virtual Private Cloud (VPC) endpoint support.
- **Knowledge Bases for RAG (Retrieval-Augmented Generation):** Managed vector store backed by OpenSearch Serverless.
- **Agents for agentic workflows:** Managed orchestration with no infrastructure management.
- **Guardrails for content filtering.**

**Cost anchoring for Bedrock:**
- Claude Haiku: Approximately $0.001 per 1,000 input tokens — use for high-volume classification.
- Claude Sonnet: Approximately $0.015 per 1,000 input tokens — use for most generative tasks.
- Claude Opus: Approximately $0.075 per 1,000 input tokens — use for complex reasoning only.
- Enable prompt caching (Anthropic SDK) to reduce costs by up to 90% on repeated context.

**SageMaker warning:** SageMaker has significant infrastructure cost ($0.10–$32/hour per instance type). Don't reach for SageMaker unless you're training or fine-tuning models. For inference with foundation models, use Bedrock.

---

## Observability

| Need | Service |
|---|---|
| Application logs | CloudWatch Logs (structured JSON) |
| Metrics | CloudWatch Metrics + custom metrics via EMF |
| Distributed tracing | AWS X-Ray |
| Synthetic monitoring | CloudWatch Synthetics (canaries) |
| Dashboards | CloudWatch dashboards or Grafana (via Amazon Managed Grafana) |
| Alarms and alerting | CloudWatch Alarms → SNS → email/Slack/PagerDuty |

**Day-one observability defaults:**
- Structured JSON logs from Lambda or ECS (use `aws-lambda-powertools` or equivalent).
- **X-Ray tracing** enabled on Lambda and API Gateway.
- **CloudWatch Alarm** on Lambda error rate > 1% and p99 duration > 1 second.
- AWS Health Dashboard integration for account-level events.

---

## Secrets Management

| Option | When to use | Cost |
|---|---|---|
| **AWS Secrets Manager** | Database credentials, API keys that need rotation | $0.40 per secret per month |
| **SSM Parameter Store (SecureString)** | Configuration values, feature flags, non-rotating secrets | Free (Standard), $0.05 per 10,000 API calls (Advanced) |
| **GitHub Actions secrets** | Continuous Integration and Deployment (CI/CD)-only values that don't need AWS-side access | Free |

**Rule:** Use Secrets Manager for anything that rotates or is shared across multiple services. Use Systems Manager (SSM) for everything else.
