# CI/CD — CDK Infrastructure Pipelines

## Pattern Overview

An IaC-only pipeline deploys infrastructure changes (CDK stacks) without a specific application runtime target. The same CDK pipeline pattern also serves as the backbone for Lambda, ECS, and other target pipelines.

Two approaches:
1. **GitHub Actions → CDK CLI** — simple, explicit, flexible (recommended for most teams)
2. **CDK Pipelines (self-mutating)** — CDK manages the pipeline itself; useful for large multi-stage environments

---

## Approach 1 — GitHub Actions → CDK CLI (Recommended)

```yaml
name: CDK Infrastructure Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: us-east-1
  NODE_VERSION: '22'

jobs:
  diff:
    # On PRs: show what will change without deploying
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Configure AWS credentials (read-only for diff)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_READONLY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: CDK diff
        run: npx cdk diff --all 2>&1 | tee cdk-diff.txt

      - name: Comment diff on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const diff = fs.readFileSync('cdk-diff.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## CDK Diff\n```\n' + diff.slice(0, 60000) + '\n```',
            });

  deploy-staging:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: CDK synth (validate)
        run: npx cdk synth --all

      - name: CDK deploy (staging)
        run: |
          npx cdk deploy --all \
            --require-approval never \
            --context env=staging \
            --outputs-file cdk-outputs.json
        env:
          CDK_DEFAULT_ACCOUNT: ${{ vars.AWS_ACCOUNT_ID }}
          CDK_DEFAULT_REGION: ${{ env.AWS_REGION }}

  deploy-prod:
    needs: deploy-staging
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Configure AWS credentials (prod)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_PROD_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: CDK deploy (prod)
        run: |
          npx cdk deploy --all \
            --require-approval never \
            --context env=prod
        env:
          CDK_DEFAULT_ACCOUNT: ${{ vars.AWS_PROD_ACCOUNT_ID }}
          CDK_DEFAULT_REGION: ${{ env.AWS_REGION }}
```

---

## CDK Bootstrap (One-Time Setup)

Bootstrap must run before any CDK deployment. The CDK bootstrap stack provisions an S3 bucket (artifacts), ECR repository, and IAM roles that CloudFormation uses during deployment.

```bash
# Install CDK globally
npm install -g aws-cdk

# Bootstrap non-prod account
# --trust: allow the GitHubActions role to use the CDK bootstrap roles
npx cdk bootstrap \
  aws://NONPROD_ACCOUNT_ID/us-east-1 \
  --trust arn:aws:iam::NONPROD_ACCOUNT_ID:role/GitHubActions-MyRepo \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
  --profile nonprod-admin

# Bootstrap prod account (scope execution policy to least-privilege)
npx cdk bootstrap \
  aws://PROD_ACCOUNT_ID/us-east-1 \
  --trust arn:aws:iam::NONPROD_ACCOUNT_ID:role/GitHubActions-MyRepo \
  --cloudformation-execution-policies arn:aws:iam::PROD_ACCOUNT_ID:policy/CdkDeployPolicy \
  --profile prod-admin
```

**Note on `--cloudformation-execution-policies`:** This controls what CloudFormation can do during deployment. `AdministratorAccess` is convenient for development but should be scoped down for production. Create a `CdkDeployPolicy` that covers only the resource types your stacks actually create.

---

## IAM Policy — CDK Deploy Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CDKBootstrapRoles",
      "Effect": "Allow",
      "Action": ["sts:AssumeRole"],
      "Resource": [
        "arn:aws:iam::*:role/cdk-*-deploy-role-*",
        "arn:aws:iam::*:role/cdk-*-file-publishing-role-*",
        "arn:aws:iam::*:role/cdk-*-image-publishing-role-*",
        "arn:aws:iam::*:role/cdk-*-lookup-role-*"
      ]
    },
    {
      "Sid": "CloudFormationRead",
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:GetTemplate",
        "cloudformation:ListStacks",
        "ssm:GetParameter"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3ArtifactAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::cdk-*-assets-*",
        "arn:aws:s3:::cdk-*-assets-*/*"
      ]
    }
  ]
}
```

---

## CDK App Structure — Recommended Layout

```
my-service/
├── bin/
│   └── app.ts              # CDK App entry point, stack instantiation
├── lib/
│   ├── stacks/
│   │   ├── api-stack.ts    # One stack per logical component
│   │   ├── data-stack.ts
│   │   └── pipeline-stack.ts
│   └── constructs/
│       └── lambda-api.ts   # Reusable L3 constructs
├── test/
│   └── stacks/
│       └── api-stack.test.ts  # CDK snapshot + assertion tests
├── cdk.json
├── package.json
└── tsconfig.json
```

**bin/app.ts pattern:**
```typescript
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/stacks/api-stack';
import { DataStack } from '../lib/stacks/data-stack';

const app = new cdk.App();

const env = app.node.tryGetContext('env') ?? 'dev';
const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION ?? 'us-east-1';

const dataStack = new DataStack(app, `DataStack-${env}`, {
  env: { account, region },
  environment: env,
});

new ApiStack(app, `ApiStack-${env}`, {
  env: { account, region },
  environment: env,
  table: dataStack.table,
});
```

---

## CDK Testing

Always write snapshot + assertion tests for CDK stacks. This catches unintended infrastructure changes during code review.

```typescript
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ApiStack } from '../../lib/stacks/api-stack';

test('Lambda function uses ARM64', () => {
  const app = new cdk.App();
  const stack = new ApiStack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
    environment: 'test',
  });

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Architectures: ['arm64'],
  });
});

test('No public S3 buckets', () => {
  // ...
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
    },
  });
});
```

---

## Drift Detection

After CDK deploys, CloudFormation can detect drift (manual console changes that diverge from the stack). Run periodically:

```bash
# Detect drift in all stacks
aws cloudformation detect-stack-drift --stack-name MyStack-staging

# Get results (may take 1-2 minutes)
aws cloudformation describe-stack-drift-detection-status \
  --stack-drift-detection-id <id-from-above>
```

Add this as a scheduled GitHub Actions workflow (weekly) to catch out-of-band changes.

---

## GitHub Actions Variables to Configure

| Variable | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | ARN of staging GitHubActions role |
| `AWS_PROD_DEPLOY_ROLE_ARN` | ARN of prod GitHubActions role |
| `AWS_READONLY_ROLE_ARN` | ARN of read-only role (for CDK diff on PRs) |
| `AWS_ACCOUNT_ID` | Non-prod AWS account ID |
| `AWS_PROD_ACCOUNT_ID` | Prod AWS account ID |
