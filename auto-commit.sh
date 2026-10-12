#!/bin/bash
cd "$(git rev-parse --show-toplevel)"

BRANCH=$(git branch --show-current)

# Bloqueia auto commit na main/master (proteção)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "Auto commit bloqueado na branch $BRANCH"
  exit 0
fi

git add -A
if ! git diff --cached --quiet; then
  git commit -m "auto($BRANCH): $(date +'%Y-%m-%d %H:%M:%S')"
  git push origin "$BRANCH"
fi
