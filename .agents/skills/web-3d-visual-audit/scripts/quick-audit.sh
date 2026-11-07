#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

if [ -d "$PROJECT_ROOT/hust-hsk" ]; then
  cd "$PROJECT_ROOT/hust-hsk"
else
  cd "$PROJECT_ROOT"
fi

echo "=== [1/4] TypeScript Check (tsc --noEmit) ==="
npx tsc --noEmit

echo "=== [2/4] Learning Engine Unit Tests (45 tests) ==="
node test/learn.test.cjs

echo "=== [3/4] Campus Navigation & Collider Simulation (leg-sim) ==="
node test/leg-sim.cjs

echo "=== [4/4] Next.js Static Export Build ==="
npm run build

echo "✅ All quick audit checks PASSED!"
