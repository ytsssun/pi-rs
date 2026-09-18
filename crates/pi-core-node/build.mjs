import { existsSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(fileURLToPath(import.meta.url));
if (!["darwin", "linux"].includes(process.platform)) {
	throw new Error("pi-core-node build supports macOS and Linux only");
}
const userCargo = join(homedir(), ".cargo", "bin", "cargo");
const cargo = process.env.CARGO || (existsSync(userCargo) ? userCargo : "cargo");
const target = join(root, "target");
const result = spawnSync(cargo, ["build", "--locked", "--release", "--manifest-path", join(root, "Cargo.toml"), "--target-dir", target], { stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
copyFileSync(join(target, "release", process.platform === "darwin" ? "libpi_core_node.dylib" : "libpi_core_node.so"), join(target, "pi-core-node.node"));
console.log(join(target, "pi-core-node.node"));
