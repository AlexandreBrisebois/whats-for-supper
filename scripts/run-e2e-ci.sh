#!/bin/bash
set -e

# Navigate to pwa directory
cd "$(dirname "$0")/../pwa" || exit 1

cleanup() {
  echo "🧹 Cleaning up..."
  kill $MOCK_API_PID $PWA_PID 2>/dev/null || true
  exit ${1:-0}
}

trap "cleanup" EXIT

echo "🚀 Starting Prism Mock API on port 5001..."
npm run mock-api > /tmp/mock-api.log 2>&1 &
MOCK_API_PID=$!
echo "Mock API PID: $MOCK_API_PID"

# Wait for Mock API to be ready
echo "⏳ Waiting for Mock API to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:5001/health > /dev/null 2>&1; then
    echo "✅ Mock API is ready"
    break
  fi
  echo "  Attempt $i/30..."
  sleep 1
done

echo "🌐 Starting PWA on port 3000 (dev mode)..."
# Kill any existing process on port 3000
lsof -ti:3000 | xargs -r kill -9 2>/dev/null || true
sleep 1
API_INTERNAL_URL=http://127.0.0.1:5001 NODE_ENV=test npm run dev > /tmp/pwa.log 2>&1 &
PWA_PID=$!
echo "PWA PID: $PWA_PID"
echo "⏳ Waiting for PWA to be ready (checking for 5 consecutive successful health checks)..."

success_count=0
for i in $(seq 1 120); do
  if curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; then
    success_count=$((success_count + 1))
    if [ $success_count -ge 5 ]; then
      echo "✅ PWA is ready and stable"
      break
    fi
  else
    success_count=0
  fi

  if [ $((i % 10)) -eq 0 ]; then
    echo "  Attempt $i/120... (PWA log: $(tail -1 /tmp/pwa.log))"
  fi
  sleep 1
done

if ! curl -sf http://127.0.0.1:3000 > /dev/null 2>&1; then
  echo "❌ PWA failed to start. Last log entries:"
  tail -20 /tmp/pwa.log
  cleanup 1
fi

echo "🧪 Running E2E tests..."
CI=true npx playwright test
TEST_EXIT=$?

if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Some tests failed (exit code: $TEST_EXIT)"
fi

cleanup $TEST_EXIT