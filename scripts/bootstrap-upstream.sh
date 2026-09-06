#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
ref=9767ba275f3e9a5ee0f5c5342249b629ab1b2282
if [ ! -d vendor/pi-mono/.git ]; then
  mkdir -p vendor
  git clone --no-checkout https://github.com/badlogic/pi-mono.git vendor/pi-mono
  git -C vendor/pi-mono checkout --detach "$ref"
fi
actual=$(git -C vendor/pi-mono rev-parse HEAD)
[ "$actual" = "$ref" ] || { echo 'Existing upstream differs; refusing to overwrite' >&2; exit 1; }
git -C vendor/pi-mono diff --exit-code
