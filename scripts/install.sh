#!/bin/sh
# Source installer: retains the Node host and native addon beside the checkout.
set -eu
usage() {
  echo 'Usage: install.sh [--source CHECKOUT] [--prefix PREFIX]'
  echo 'Default prefix: ${CARGO_HOME:-$HOME/.cargo}; executable: PREFIX/bin/pi-rs'
}
source_dir=
prefix=${CARGO_HOME:-"$HOME/.cargo"}
while [ "$#" -gt 0 ]; do
  case "$1" in
    --source|--prefix)
      [ "$#" -ge 2 ] || { usage >&2; exit 2; }
      case "$1" in --source) source_dir=$2;; --prefix) prefix=$2;; esac
      shift 2;;
    --help|-h) usage; exit 0;;
    *) usage >&2; exit 2;;
  esac
done
export PATH="${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"
for tool in cargo rustc node npm python3 git; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Missing prerequisite: $tool" >&2; exit 1; }
done
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if(major<22 || (major===22 && minor<19)) { console.error("Node.js 22.19+ required"); process.exit(1); }'
case "$(uname -s)" in Darwin|Linux) ;; *) echo 'Only macOS and Linux are supported' >&2; exit 1;; esac
if [ -z "$source_dir" ]; then
  data_dir=${XDG_DATA_HOME:-"$HOME/.local/share"}/pi-rs
  mkdir -p "$data_dir"
  source_dir=$(mktemp -d "$data_dir/source.XXXXXXXX")
  git clone https://github.com/ytsssun/pi-rs.git "$source_dir"
fi
source_dir=$(cd "$source_dir" && pwd)
[ -f "$source_dir/scripts/build-native-session.py" ] || { echo 'Not a pi-rs checkout' >&2; exit 1; }
cd "$source_dir"
sh scripts/bootstrap-upstream.sh --build
python3 scripts/build-native-session.py
cargo install --locked --path . --bin pi-rs --root "$prefix" --force
"$prefix/bin/pi-rs" --help
printf '\nInstalled: %s/bin/pi-rs\nKeep runtime files at: %s\n' "$prefix" "$source_dir"
printf 'Add %s/bin to PATH if needed, then run: pi-rs --help\n' "$prefix"
