#!/usr/bin/env bash
# Only the verified Tariff snapshot is stored on this independent data branch.
set -euo pipefail
branch=refs/heads/tariff-pages-snapshot
mode=${1:?read or write}
directory=${2:?snapshot directory}
if git ls-remote --exit-code origin "$branch" > /dev/null; then
  git fetch --quiet --no-tags --depth=1 origin "$branch"
  parent=$(git rev-parse FETCH_HEAD)
else
  status=$?
  if [[ $status != 2 ]]; then exit "$status"; fi
  parent=''
fi

case "$mode" in
  read)
    if [[ -n "$parent" ]]; then
      git restore --source="$parent" --worktree -- tariff-signal/
      echo "Tariff snapshot: $parent"
    else
      echo 'Using the bootstrap snapshot from main.'
    fi
    python3 .github/scripts/pages/tariff.py stage "$directory"
    ;;
  write)
    # The isolated index contains only the candidate, never the website checkout.
    store=$(mktemp -d)
    trap 'rm -rf "$store"' EXIT
    cp -R "$directory" "$store/tariff-signal"
    export GIT_INDEX_FILE="$store/index"
    git --work-tree="$store" add -f -- tariff-signal/
    tree=$(git write-tree)
    parents=()
    if [[ -n "$parent" ]]; then
      if [[ "$tree" == "$(git rev-parse "$parent^{tree}")" ]]; then exit 0; fi
      parents=(-p "$parent")
    fi
    commit=$(git -c user.name=github-actions -c user.email=github-actions@users.noreply.github.com \
      commit-tree "$tree" "${parents[@]}" -m 'Refresh verified Tariff Signal snapshot')
    git push origin "$commit:$branch"
    ;;
  *) exit 2 ;;
esac
