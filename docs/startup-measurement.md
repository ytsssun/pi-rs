# CLI help process baseline

This is the first measured slice, not the previously proposed full benchmark suite. Restore, tool-loop, parallel tools, memory and upstream comparisons remain open. No model/network request is made by this help-path measurement.

Build outside the measurement, then run:

```sh
cargo build --locked --bin pi-rs
python3 scripts/measure-startup.py --binary "$PWD/target/debug/pi-rs" --json-out /tmp/pi-startup.json
```

The script validates help output and every child exit, uses a temporary working directory outside the source tree, times ten fresh processes after two warmups, and reports raw milliseconds and a binary hash. A failed launch is a nonzero exit with `status: failed`, never a fallback measurement. This is warm-filesystem-cache process latency, not cold-cache startup or full agent initialization. Compilation, inference, tools and memory are excluded. No performance threshold or speedup claim is established.

Local baseline metadata and raw measurements are recorded alongside this document. The binary was built from source commit 7d3d38e with the debug profile; this is a development configuration, not a release comparison. Node 22.18 was used for help only, not the installer acceptance requiring newer Node.
