#!/usr/bin/env bash
set -euo pipefail
if ! xcode-select -p >/dev/null 2>&1; then xcode-select --install || true; fi
if ! command -v brew >/dev/null 2>&1; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi
if [[ $(uname -m) == "arm64" ]]; then eval "$(/opt/homebrew/bin/brew shellenv)"; fi
brew install nvm pnpm git gh jq docker
export NVM_DIR="$HOME/.nvm"; mkdir -p "$NVM_DIR"; source "$(brew --prefix nvm)/nvm.sh"
nvm install --lts && nvm alias default 'lts/*'
git config --global init.defaultBranch main
git config --global pull.rebase false
git config --global core.autocrlf input
echo "✅ macOS bootstrap complete."
