# GitHub Actions → AWS CI/CD Patterns

## Core Principle: OIDC Authentication

Never use long-lived IAM access keys in GitHub Actions. Use OIDC federation — GitHub exchanges a short-lived JWT for temporary AWS credentials scoped to an IAM role. No secrets to rotate, no credentials to leak.

---

## Step 1 — Set Up the OIDC Trust (One-Time, Per AWS Account)

### CloudFormation Template
```yaml
# oidc-github-trust.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: GitHub OIDC provider and base deploy role

Parameters:
  GitHubOrg:
    Type: String
    Description: GitHub organization or username
  GitHubRepo:
    Type: String
    Description: Repository name (or * for all repos in org)
  AllowedBranches:
    Type: String
    Default: "refs/heads/main"
    Description: Branch filter (refs/heads/main or * for any branch)

Resources:
  GitHubOIDCProvider:
    Type: AWS::IAM::OIDCProvider
    Properties:
      Url: https://token.actions.githubusercontent.com
      ClientIdList:
        - sts.amazonaws.com
      ThumbprintList:
        - 6938fd4d98bab03faadb97b34396831e3780aea1
        - 1c58a3a8518e8759bf075b76b750d4f2df264fcd

  GitHubActionsRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub "GitHubActions-${GitHubRepo}"
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Federated: !Ref GitHubOIDCProvider
            Action: sts:AssumeRoleWithWebIdentity
            Condition:
              StringEquals:
                token.actions.githubusercontent.com:aud: sts.amazonaws.com
              StringLike:
                token.actions.githubusercontent.com:sub:
                  !Sub "repo:${GitHubOrg}/${GitHubRepo}:ref:${AllowedBranches}"

Outputs:
  RoleArn:
    Value: !GetAtt GitHubActionsRole.Arn
    Export:
      Name: GitHubActionsRoleArn
```

### CDK Equivalent
```typescript
import * as iam from 'aws-cdk-lib/aws-iam';

const provider = new iam.OpenIdConnectProvider(this, 'GitHubOIDC', {
  url: 'https://token.actions.githubusercontent.com',
  clientIds: ['sts.amazonaws.com'],
  thumbprints: [
    '6938fd4d98bab03faadb97b34396831e3780aea1',
    '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
  ],
});

const deployRole = new iam.Role(this, 'GitHubActionsRole', {
  roleName: 'GitHubActions-MyRepo',
  assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
    StringEquals: {
      'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
    },
    StringLike: {
      'token.actions.githubusercontent.com:sub':
        'repo:MyOrg/MyRepo:ref:refs/heads/main',
    },
  }),
});
```

---

## Step 2 — Use OIDC in Workflows

```yaml
# Every workflow that deploys to AWS
permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActions-MyRepo
          aws-region: us-east-1
          role-session-name: GitHubActions-${{ github.run_id }}
```

---

## Environment Strategy

### Branch → Environment → AWS Account Mapping

| Branch | Environment | AWS Account | Deployment |
|---|---|---|---|
| `feature/*` | dev | Non-prod account | Automatic on push |
| `main` | staging | Non-prod account | Automatic on push |
| `main` (tag `v*`) | prod | Prod account | Manual approval required |

### GitHub Environments for Manual Approval

1. In the repo: Settings → Environments → New environment: `production`
2. Add required reviewers (your team)
3. Reference in workflow:

```yaml
jobs:
  deploy-prod:
    environment: production   # triggers approval gate
    runs-on: ubuntu-latest
    steps:
      # ...deploy steps
```

---

## Secrets Management Strategy

| Secret Type | Where to Store | How to Access in Actions |
|---|---|---|
| AWS credentials | OIDC (no secret needed) | `aws-actions/configure-aws-credentials` |
| Database passwords | AWS Secrets Manager | `aws secretsmanager get-secret-value` in workflow step |
| App config / feature flags | SSM Parameter Store | `aws ssm get-parameter` or CDK deploy reads at synth time |
| Build-time secrets (NPM token, etc.) | GitHub encrypted secrets | `${{ secrets.NPM_TOKEN }}` |
| Environment-specific values | GitHub Environment secrets | `${{ secrets.PROD_API_KEY }}` |

**Rule:** Never store AWS account IDs, role ARNs, or region names as secrets — they're not secret. Store them as GitHub Actions variables (Settings → Variables) or hardcode in the workflow.

---

## Standard Workflow Structure

```yaml
name: CI/CD

on:
  push:
    branches: [main, 'feature/**']
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  # ── 1. Lint + Test ──────────────────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test

  # ── 2. Build ────────────────────────────────────────────────────────
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  # ── 3. Deploy to Non-Prod ───────────────────────────────────────────
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}
      # deploy target steps here

  # ── 4. Deploy to Prod (manual approval) ────────────────────────────
  deploy-prod:
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_PROD_DEPLOY_ROLE_ARN }}
          aws-region: ${{ vars.AWS_REGION }}
      # deploy target steps here
```

---

## Multi-Account Deployment Pattern

When deploying from a non-prod account role to a prod account role, use role chaining:

```yaml
- name: Configure AWS credentials (non-prod base role)
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::NONPROD_ACCOUNT:role/GitHubActions-MyRepo
    aws-region: us-east-1

- name: Assume prod deploy role
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::PROD_ACCOUNT:role/DeployRole
    aws-region: us-east-1
    role-chaining: true
```

The prod account's `DeployRole` trust policy must allow assumption from the non-prod `GitHubActions-MyRepo` role ARN.

---

## IAM Role Scoping — Least Privilege

The deploy role should have only the permissions needed for the deployment. See per-target IAM policies in:
- [cicd-targets/lambda.md](cicd-targets/lambda.md)
- [cicd-targets/ecs-fargate.md](cicd-targets/ecs-fargate.md)
- [cicd-targets/s3-cloudfront.md](cicd-targets/s3-cloudfront.md)
- [cicd-targets/iac-cdk.md](cicd-targets/iac-cdk.md)

**Never use `AdministratorAccess` on the deploy role.** Start from the minimum and add permissions as needed.

---

## Branch Protection Rules (GitHub)

Configure these on `main` before any production deployments:

- Require pull request before merging
- Require status checks to pass (CI job)
- Require branches to be up to date before merging
- Require linear history (squash merges)
- Restrict direct pushes (nobody pushes to main directly)
- Require deployments to succeed in staging before prod environment gate opens (use `deployment_status` event or Environment protection rules)
