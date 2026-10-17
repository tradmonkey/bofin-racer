#!/bin/zsh
cd "${0:A:h}"
TASK_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
if [[ -x "$TASK_NODE/node" ]]; then
  export PATH="$TASK_NODE:$PATH"
fi
if curl -fsS 'http://127.0.0.1:5173' 2>/dev/null | rg -q 'Bofin Racer'; then
  open 'http://127.0.0.1:5173'
  exit 0
fi
if [[ ! -d node_modules ]]; then
  npm install || exit 1
fi
(sleep 3; open 'http://127.0.0.1:5173') &
npm run dev -- --port 5173 --strictPort
