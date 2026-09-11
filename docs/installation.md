# Installation and development

The installer builds from source and uses `cargo install --locked --path . --bin pi-rs` to install a release launcher. Rust, Node.js 22.19+, npm, Python 3, Git, and platform build tools are prerequisites. It installs pinned upstream Node dependencies and builds the Rust Node-API addon. The addon currently uses the development build profile; no performance claim is made.

The source build downloads upstream model catalog data using `hydrate:model-data` before the offline compilation step. This requires network access; the Pi source commit is pinned, but these external catalog inputs are not pinned. A catalog outage fails installation rather than silently substituting stale data. No model API credentials are required.

## Locations

Default command: `$CARGO_HOME/bin/pi-rs`, or `~/.cargo/bin/pi-rs` if CARGO_HOME is unset. Use `--prefix "$HOME/.local"` for `~/.local/bin/pi-rs`. The installer does not edit shell profiles; add the chosen bin directory to PATH yourself.

Remote installation retains a checkout under `${XDG_DATA_HOME:-$HOME/.local/share}/pi-rs/source.*`. A local installation (`sh scripts/install.sh --source "$PWD"`) uses the existing checkout. Keep this directory: the launcher resolves the original Node host, dependencies and addon there. Moving or deleting it breaks the installed command. A bare `cargo install --git ...` is therefore not supported yet.

The curl URL follows main, not a versioned release. To inspect before running:

```sh
curl -fsSL https://raw.githubusercontent.com/ytsssun/pi-rs/main/scripts/install.sh -o /tmp/pi-rs-install.sh
less /tmp/pi-rs-install.sh
sh /tmp/pi-rs-install.sh
```

## Updates and removal

Re-run the remote installer to build a fresh checkout and replace the installed command. Old runtime directories remain intact; remove an old directory only after verifying the new installation. For a local checkout, update it normally and re-run the local installer. Installation replaces an existing pi-rs command at the selected prefix.

Use `cargo uninstall pi-rs` (or `cargo uninstall --root "$HOME/.local" pi-rs` for that prefix), then remove the retained runtime directory printed during installation. Never remove a source checkout containing work you want to keep.

## Development only

```sh
sh scripts/bootstrap-upstream.sh --build
python3 scripts/build-native-session.py
cargo build --locked --bin pi-rs
./target/debug/pi-rs --help
```

No prebuilt release artifacts, Windows installer, or standalone binary distribution are provided yet.
