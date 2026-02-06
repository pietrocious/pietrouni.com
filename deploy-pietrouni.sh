#!/bin/bash
set -e

REPO_DIR="/home/ec2-user/pietrouni.com"
BUCKET="pietrouni.com"
CF_DIST_ID="EYTCRVJKEMOQJ"

echo "==> Pulling latest changes..."
cd $REPO_DIR
git pull origin main

echo "==> Building site..."
npm run build

echo "==> Syncing to S3..."
aws s3 sync dist/ s3://${BUCKET}/ \
  --delete \
  --exclude "vault/*"

echo "==> Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id ${CF_DIST_ID} \
  --paths "/*"

echo "==> Deployment complete!"
