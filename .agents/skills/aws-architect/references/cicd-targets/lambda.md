# CI/CD — Lambda / Serverless Deployments

## Prerequisites

- CDK bootstrapped in each target account + region: `cdk bootstrap aws://ACCOUNT/REGION`
- OIDC trust configured: see [cicd-github-actions.md](../cicd-github-actions.md)
- CDK app in `infra/` or root of repo

---

## GitHub Actions Workflow — CDK Lambda Deploy

```yaml
name: Deploy Lambda (CDK)

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: us-east-1
  NODE_VERSION: '22'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm test

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
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

      - name: CDK deploy
        run: npx cdk deploy --all --require-approval never --context env=staging
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

      - name: Configure AWS credentials (prod account)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_PROD_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: CDK deploy (prod)
        run: npx cdk deploy --all --require-approval never --context env=prod
        env:
          CDK_DEFAULT_ACCOUNT: ${{ vars.AWS_PROD_ACCOUNT_ID }}
          CDK_DEFAULT_REGION: ${{ env.AWS_REGION }}
```

---

## GitHub Actions Workflow — SAM Deploy

```yaml
name: Deploy Lambda (SAM)

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

env:
  AWS_REGION: us-east-1
  SAM_BUCKET: my-sam-artifacts-bucket   # S3 bucket for SAM artifacts

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: aws-actions/setup-sam@v2
        with:
          use-installer: true

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: SAM build
        run: sam build --use-container

      - name: SAM deploy
        run: |
          sam deploy \
            --stack-name my-service-staging \
            --s3-bucket ${{ env.SAM_BUCKET }} \
            --capabilities CAPABILITY_IAM \
            --no-confirm-changeset \
            --parameter-overrides Environment=staging
```

---

## IAM Policy — Lambda Deploy Role (Least Privilege)

Attach this to the `GitHubActions-MyRepo` role. Scope `Resource` to your specific Lambda ARNs and stack names in production.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CDKBootstrapAccess",
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks",
        "cloudformation:GetTemplate",
        "cloudformation:ListStacks",
        "ssm:GetParameter"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudFormationDeploy",
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:CreateChangeSet",
        "cloudformation:ExecuteChangeSet",
        "cloudformation:DeleteChangeSet",
        "cloudformation:DescribeChangeSet",
        "cloudformation:DescribeStackEvents",
        "cloudformation:DescribeStackResources",
        "cloudformation:ValidateTemplate"
      ],
      "Resource": "arn:aws:cloudformation:*:*:stack/my-service-*/*"
    },
    {
      "Sid": "LambdaDeploy",
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:PublishVersion",
        "lambda:CreateAlias",
        "lambda:UpdateAlias",
        "lambda:GetFunction",
        "lambda:AddPermission",
        "lambda:RemovePermission",
        "lambda:TagResource"
      ],
      "Resource": "arn:aws:lambda:*:*:function:my-service-*"
    },
    {
      "Sid": "IAMPassRole",
      "Effect": "Allow",
      "Action": ["iam:PassRole"],
      "Resource": "arn:aws:iam::*:role/my-service-*",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "lambda.amazonaws.com"
        }
      }
    },
    {
      "Sid": "S3ArtifactBucket",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:GetBucketLocation"],
      "Resource": [
        "arn:aws:s3:::cdk-*-assets-*",
        "arn:aws:s3:::cdk-*-assets-*/*",
        "arn:aws:s3:::my-sam-artifacts-bucket/*"
      ]
    },
    {
      "Sid": "ECRForContainerLambda",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## CDK Lambda Stack — Minimal Example

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Tags } from 'aws-cdk-lib';

export class MyServiceStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: cdk.StackProps & { env: string }) {
    super(scope, id, props);

    Tags.of(this).add('env', props.env);
    Tags.of(this).add('workload', 'my-service');

    const fn = new NodejsFunction(this, 'Handler', {
      entry: 'src/handler.ts',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64, // 20% cheaper
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: props.env,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // HTTP API — 70% cheaper than REST API for most use cases
    const api = new apigateway.HttpApi(this, 'Api', {
      defaultIntegration: new integrations.HttpLambdaIntegration('Integration', fn),
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
  }
}
```

---

## CDK Bootstrap

Run once per account + region before first deployment:

```bash
# Non-prod account
npx cdk bootstrap aws://NONPROD_ACCOUNT_ID/us-east-1 \
  --trust GITHUB_ACTIONS_ROLE_ARN \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess

# Prod account (restrict execution policy to least-privilege)
npx cdk bootstrap aws://PROD_ACCOUNT_ID/us-east-1 \
  --trust GITHUB_ACTIONS_ROLE_ARN \
  --cloudformation-execution-policies arn:aws:iam::PROD_ACCOUNT_ID:policy/CdkDeployPolicy
```
