#!/usr/bin/env bash
# Push this project to GitHub without the token being saved anywhere.
#
#   ./scripts/push-with-token.sh
#
# Prompts for a GitHub personal access token (input hidden), pushes, then
# discards the token. Nothing is written to .git/config, shell history, or disk.
#
# Create a token at: GitHub → Settings → Developer settings → Personal access
# tokens → Fine-grained tokens. Give it read/write "Contents" permission on
# this repository only. Revoke it afterwards.

set -euo pipefail

REPO_URL="https://github.com/igwechris200/igwechris200-House-of-b-wears.git"
BRANCH="main"

# Token can also be supplied non-interactively:  GITHUB_TOKEN=ghp_xxx ./scripts/push-with-token.sh
if [ -n "${GITHUB_TOKEN:-}" ]; then
  TOKEN="${GITHUB_TOKEN}"
else
  printf "GitHub personal access token (input hidden): "
  read -rs TOKEN
  printf "\n"
fi

if [ -z "$TOKEN" ]; then
  echo "✗ No token provided." >&2
  exit 1
fi

# Confirm everything is committed before pushing.
if [ -n "$(git status --porcelain)" ]; then
  echo "▸ Committing local changes first…"
  git add -A
  git commit -m "Commit local changes before pushing" || true
fi

# A temporary askpass helper returns the token only for this push.
ASKPASS="$(mktemp)"
trap 'rm -f "$ASKPASS"' EXIT
printf '#!/bin/sh\necho "$GITHUB_TOKEN"\n' > "$ASKPASS"
chmod +x "$ASKPASS"

echo "▸ Pushing ${BRANCH} to ${REPO_URL}…"
if GIT_TERMINAL_PROMPT=0 GIT_ASKPASS="$ASKPASS" GITHUB_TOKEN="$TOKEN" \
     git push -u "origin" "$BRANCH"; then
  echo ""
  echo "✓ Pushed successfully."
  echo "  https://github.com/igwechris200/igwechris200-House-of-b-wears"
  echo ""
  echo "  Remember to revoke the token when you are finished."
else
  echo ""
  echo "✗ Push failed." >&2
  echo "  Check the token has read/write 'Contents' permission on this repo," >&2
  echo "  and that it has not expired." >&2
  exit 1
fi
