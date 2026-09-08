#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"
mkdir -p target
args=()
case "$(uname -s)" in
  Darwin) args=(-C link-arg=-undefined -C link-arg=dynamic_lookup) ;;
  Linux) ;;
  *) echo 'Native seam build is only configured for Darwin/Linux; other targets unverified.' >&2; exit 2 ;;
esac
rustc --edition 2021 --crate-type cdylib -C panic=abort "${args[@]}" prototype/native-seam.rs -o target/native-seam.node
