#!/usr/bin/env bash
# Shared by serialized Atlas writers. Never force-push generated output.
set -euo pipefail

for attempt in 1 2 3; do
  # Conditional commands remain retryable with Actions' bash -e enabled.
  if git fetch origin main; then
    if ! git rebase --autostash origin/main; then
      # A real content conflict cannot safely be fixed by retrying or choosing ours.
      git rebase --abort || true
      echo "::error::Generated changes conflict with main. No push attempted; rerun the workflow to regenerate from current main." >&2
      exit 1
    fi
    # An autostash can conflict even after a successful rebase.
    if [ -n "$(git diff --name-only --diff-filter=U)" ]; then
      echo "::error::Unresolved generated-file conflicts; refusing to push." >&2
      exit 1
    fi
    if git push origin HEAD:main; then
      exit 0
    fi
  fi
  if [ "$attempt" = 3 ]; then
    echo "::error::Could not save generated changes after three attempts." >&2
    exit 1
  fi
  sleep 3
done
