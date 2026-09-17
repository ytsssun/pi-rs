// Test-only package substitution. Does not rewrite vendored files.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@earendil-works/pi-agent-core') {
    return {url:new URL(process.env.PI_RS_PROBE_FIXED_STREAM==='1'?'./upstream-cli-agent-fixture.mjs':'./upstream-cli-agent.mjs',import.meta.url).href,shortCircuit:true};
  }
  return nextResolve(specifier,context);
}
