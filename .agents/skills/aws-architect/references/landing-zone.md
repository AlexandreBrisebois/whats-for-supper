# AWS Landing Zone Reference

A landing zone is the multi-account AWS environment that all workloads live inside. Getting it right early is much cheaper than restructuring later.

---

## Control Tower vs Custom Landing Zone

### AWS Control Tower — Recommended for most teams

**Choose Control Tower when:**
- Greenfield setup with no existing AWS Organization
- Team size < 50 engineers
- No existing custom guardrail/SCP framework
- You want Account Factory (automated account vending)
- You want a managed baseline (CloudTrail, Config, GuardDuty) across all accounts out of the box

**What you get:**
- Centralized governance with Service Control Policies (SCPs) applied at the OU level
- Account Factory: create new accounts via a self-service portal or API
- Managed guardrails: preventive (SCP-based) and detective (Config rules)
- Log Archive account: all CloudTrail and Config logs aggregated automatically
- Audit account: cross-account read access for security review

**What you give up:**
- Less flexibility to customize the baseline before enrollment
- Account enrollment can take 15-30 minutes
- Some AWS services aren't fully supported in all regions

**Cost:** Control Tower itself is free. The underlying services (CloudTrail, Config, S3, GuardDuty) have costs — budget ~$20-50/month for a minimal setup.

---

### Custom / Manual Landing Zone

**Choose custom when:**
- Existing AWS Organization with established SCP framework
- Regulated industry with specific compliance controls that conflict with Control Tower guardrails
- Need for custom account vending pipeline (Service Catalog or CDK)
- Large org with a dedicated platform engineering team

**What you need to build yourself:**
- AWS Organizations structure (OUs, SCPs)
- CloudTrail org trail
- GuardDuty org enrollment
- Security Hub aggregation
- Config aggregator
- Log archive account with S3 lifecycle policies
- Account baseline IaC (CDK StackSets or CloudFormation StackSets)

---

## OU Structure

### Minimal OU Structure (greenfield, small team)

```
Root
├── Security OU
│   ├── Log Archive account
│   └── Audit (Security Tooling) account
├── Infrastructure OU
│   └── Shared Services account (DNS, networking hub)
├── Workloads OU
│   ├── Production account
│   └── Non-Production account (dev + staging)
└── Sandbox OU
    └── Individual developer sandbox accounts
```

**Why separate accounts (not just environments)?**
- Blast radius isolation: a misconfigured IAM policy in dev can't affect prod
- Cost attribution: per-account billing is cleaner than tag-based attribution
- SCP enforcement: guardrails apply at the account level, not at the resource level

### Scaling the OU structure

As the organization grows, split Non-Production into Dev and Staging accounts. Add a `Workloads-<team>` OU per product team if chargeback is required.

Do not pre-create OUs or accounts you don't need yet. Add them when the team or workload exists.

---

## Baseline Accounts

### Management Account
- **Never** run workloads here
- Only: AWS Organizations, Control Tower, billing, and account vending
- Root MFA required
- No IAM users with console access (use SSO from Identity Center)

### Log Archive Account
- S3 buckets for CloudTrail (org trail), Config snapshots, VPC Flow Logs
- S3 Object Lock (WORM) for compliance if required
- No human access to buckets except the security/audit role
- S3 lifecycle: transition to Intelligent-Tiering after 30 days, Glacier after 90 days

### Audit Account
- Read-only cross-account roles for security review
- Security Hub aggregation from all member accounts
- GuardDuty administrator account

### Shared Services Account (optional, but recommended after 3+ workload accounts)
- Route 53 private hosted zones (shared DNS)
- Transit Gateway attachment (if VPC-to-VPC routing needed)
- AWS Identity Center (SSO) permission sets
- ECR repositories shared across accounts (for container images)

---

## Identity and Access (IAM Identity Center / SSO)

**Always use IAM Identity Center** (formerly AWS SSO) for human access — never create IAM users in member accounts.

Setup:
1. Enable IAM Identity Center in the management account
2. Connect to your identity provider (Entra ID / Azure AD, Okta, or built-in directory)
3. Create Permission Sets (map to IAM roles): AdministratorAccess, ReadOnlyAccess, PowerUserAccess, SecurityAudit
4. Assign Permission Sets to groups (from your IdP) per account

**OIDC for CI/CD** — do not use long-lived IAM credentials for GitHub Actions. See [cicd-github-actions.md](cicd-github-actions.md).

---

## Networking Baseline

For small teams, start simple. Add complexity only when you have a concrete requirement.

### Option A: Public Subnets Only (smallest budget, lowest ops burden)
- Suitable for: Lambda, API Gateway, DynamoDB — no VPC needed at all
- Lambda functions that don't need VPC access run without any VPC configuration
- Cost: $0 for networking

### Option B: VPC with Public + Private Subnets (most common)
- 2 AZs minimum for prod, 1 AZ acceptable for dev
- Public subnets: ALB, NAT Gateway (if needed), Bastion (prefer SSM instead)
- Private subnets: ECS tasks, RDS, Lambda (when VPC access needed)
- NAT Gateway cost: ~$32/month per AZ + $0.045/GB data processed — budget for this

### Option C: VPC with VPC Endpoints (avoid NAT Gateway costs)
- Replace NAT Gateway with VPC Interface Endpoints for S3, DynamoDB, SSM, Secrets Manager, ECR
- Endpoint cost: ~$7.20/month each — cheaper than NAT if data volume is high
- Use when Lambda/ECS needs to call AWS services but not the public internet

### Transit Gateway (only when needed)
- Connects VPCs across accounts
- Cost: $0.05/hour per attachment (~$36/month) + data processing
- Only add when you have 3+ VPCs that need to communicate

---

## SCPs — Service Control Policies

Apply at the OU level. Start with a deny-list approach (allow all, deny specific unsafe actions).

**Recommended baseline SCPs:**

```json
// Deny leaving the Organization
{
  "Effect": "Deny",
  "Action": ["organizations:LeaveOrganization"],
  "Resource": "*"
}

// Deny disabling CloudTrail
{
  "Effect": "Deny",
  "Action": [
    "cloudtrail:StopLogging",
    "cloudtrail:DeleteTrail",
    "cloudtrail:UpdateTrail"
  ],
  "Resource": "*"
}

// Deny disabling GuardDuty
{
  "Effect": "Deny",
  "Action": [
    "guardduty:DeleteDetector",
    "guardduty:DisassociateFromMasterAccount",
    "guardduty:StopMonitoringMembers"
  ],
  "Resource": "*"
}

// Deny root account actions (except break-glass)
{
  "Effect": "Deny",
  "Action": "*",
  "Resource": "*",
  "Condition": {
    "StringLike": {
      "aws:PrincipalArn": "arn:aws:iam::*:root"
    }
  }
}
```

**Region restriction SCP** (add when you have a defined AWS region strategy):
```json
{
  "Effect": "Deny",
  "Action": "*",
  "Resource": "*",
  "Condition": {
    "StringNotEquals": {
      "aws:RequestedRegion": ["us-east-1", "us-west-2"]
    }
  }
}
```

---

## Landing Zone Checklist

- [ ] AWS Organization created with all features enabled
- [ ] Management account: MFA on root, no workloads, IAM Identity Center enabled
- [ ] Log Archive account: S3 bucket for CloudTrail org trail, Object Lock if compliance required
- [ ] Audit account: Security Hub administrator, GuardDuty administrator
- [ ] CloudTrail org trail: all regions, all accounts, write to Log Archive S3
- [ ] GuardDuty: enabled in all accounts and regions
- [ ] AWS Config: enabled with org aggregator
- [ ] Security Hub: enabled with CIS AWS Foundations Benchmark standard
- [ ] IAM Identity Center: connected to IdP, permission sets defined
- [ ] Baseline SCPs applied: no-leave-org, no-disable-cloudtrail, no-disable-guardduty
- [ ] AWS Budgets: alert in management account + per workload account
- [ ] Mandatory resource tagging enforced via AWS Config rule or SCP
