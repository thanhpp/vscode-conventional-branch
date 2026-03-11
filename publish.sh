#!/usr/bin/env bash
set -euo pipefail

echo "==> Running tests..."
npm test

echo "==> Building..."
npm run build

echo "==> Publishing patch version..."
vsce publish patch
