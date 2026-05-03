# CI/CD — Static Sites and Frontend Assets (S3 + CloudFront)

## Pattern Overview

S3 hosts the built assets. CloudFront serves them globally with caching. The deployment is a 3-step process:

1. Build the frontend
2. Sync built files to S3 (with `--delete` to remove stale files)
3. Invalidate the CloudFront cache for changed paths

---

## GitHub Actions Workflow

```yaml
name: Deploy Frontend (S3 + CloudFront)

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

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ vars.STAGING_API_URL }}   # or NEXT_PUBLIC_*, etc.

      - uses: actions/upload-artifact@v4
        with:
          name: frontend-build
          path: dist/   # or out/ for Next.js static export

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: frontend-build
          path: dist/

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Sync to S3
        run: |
          # Immutable assets (hashed filenames) — long cache
          aws s3 sync dist/ s3://${{ vars.S3_BUCKET_STAGING }} \
            --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html" \
            --exclude "*.html"

          # HTML files — no cache (always fresh)
          aws s3 sync dist/ s3://${{ vars.S3_BUCKET_STAGING }} \
            --delete \
            --cache-control "no-cache, no-store, must-revalidate" \
            --include "*.html"

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CF_DISTRIBUTION_STAGING }} \
            --paths "/*"

  deploy-prod:
    needs: deploy-staging
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: frontend-build
          path: dist/

      - name: Configure AWS credentials (prod)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_PROD_DEPLOY_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Sync to S3 (prod)
        run: |
          aws s3 sync dist/ s3://${{ vars.S3_BUCKET_PROD }} \
            --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html" \
            --exclude "*.html"

          aws s3 sync dist/ s3://${{ vars.S3_BUCKET_PROD }} \
            --cache-control "no-cache, no-store, must-revalidate" \
            --include "*.html"

      - name: Invalidate CloudFront cache (prod)
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ vars.CF_DISTRIBUTION_PROD }} \
            --paths "/*"
```

---

## IAM Policy — S3 + CloudFront Deploy Role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Deploy",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-site-staging",
        "arn:aws:s3:::my-site-staging/*",
        "arn:aws:s3:::my-site-prod",
        "arn:aws:s3:::my-site-prod/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidate",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": [
        "arn:aws:cloudfront::*:distribution/STAGING_DIST_ID",
        "arn:aws:cloudfront::*:distribution/PROD_DIST_ID"
      ]
    }
  ]
}
```

---

## CDK Stack — S3 + CloudFront Static Site

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class FrontendStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: cdk.StackProps & { env: string }) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: props.env === 'prod'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.env !== 'prod',
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      defaultRootObject: 'index.html',
      // SPA routing: return index.html for 403/404
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US + Europe only — cheaper
    });

    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'DistributionDomain', { value: distribution.domainName });
  }
}
```

---

## Cache-Control Strategy

| File type | Cache-Control | Rationale |
|---|---|---|
| `index.html`, `*.html` | `no-cache, no-store` | Always fetch fresh; HTML points to hashed assets |
| `*.js`, `*.css` with hash | `public, max-age=31536000, immutable` | Content-addressable — safe to cache forever |
| `*.woff2`, fonts | `public, max-age=31536000, immutable` | Fonts don't change |
| `favicon.ico`, `robots.txt` | `public, max-age=86400` | Mostly static, 1-day cache |
| `manifest.json` | `no-cache` | PWA manifest changes need to be picked up |

**Cost note:** CloudFront invalidations are free for the first 1,000 paths/month. Invalidating `/*` counts as one path. For high-frequency deploys, consider path-specific invalidations for changed files only.

---

## GitHub Actions Variables to Configure

| Variable Name | Value |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | ARN of the staging deploy role |
| `AWS_PROD_DEPLOY_ROLE_ARN` | ARN of the prod deploy role |
| `S3_BUCKET_STAGING` | S3 bucket name (staging) |
| `S3_BUCKET_PROD` | S3 bucket name (prod) |
| `CF_DISTRIBUTION_STAGING` | CloudFront distribution ID (staging) |
| `CF_DISTRIBUTION_PROD` | CloudFront distribution ID (prod) |
| `STAGING_API_URL` | Backend API URL for staging builds |
