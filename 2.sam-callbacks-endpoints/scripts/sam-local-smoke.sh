#!/usr/bin/env bash
# Local smoke: run sam local invoke for each (FunctionLogicalId, event) pair.
# Requires: sam CLI, Docker (for sam local), and a prior `sam build` (use --use-container for closest parity).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Pairs: "CloudFormationLogicalId|path/to/event.json"
# Expand this list as you add events under events/ (see docs/sdd-local-validation-spec.md).
INVOKE_PAIRS=(
  "GetCallsInSystemFunction|events/get_calls_in_system_options.json"
  "GetCallbackConcurrencyMetricsFunction|events/get_callback_concurrency_metrics_event.json"
)

# Optional env vars: AWS_PROFILE, AWS_REGION, SKIP_PULL_IMAGE
AWS_PROFILE="${AWS_PROFILE:-}"
AWS_REGION="${AWS_REGION:-}"
SKIP_PULL_IMAGE="${SKIP_PULL_IMAGE:-}"

sam_extra=()
if [[ "${SKIP_PULL_IMAGE}" == "1" ]]; then
  sam_extra+=(--skip-pull-image)
fi
if [[ -n "${AWS_PROFILE}" ]]; then
  sam_extra+=(--profile "${AWS_PROFILE}")
fi
if [[ -n "${AWS_REGION}" ]]; then
  sam_extra+=(--region "${AWS_REGION}")
fi
# Use env.json if it exists
if [[ -f "env.json" ]]; then
  sam_extra+=(--env-vars env.json)
fi

for pair in "${INVOKE_PAIRS[@]}"; do
  IFS='|' read -r fn event <<<"$pair"
  echo "==> sam local invoke ${fn} --event ${event}"
  sam local invoke "${fn}" --event "${event}" "${sam_extra[@]}"
done

echo "All smoke invokes completed OK."
