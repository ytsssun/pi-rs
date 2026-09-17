// Test-only package substitution. Does not rewrite vendored files.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@earendil-works/pi-agent-core') {
    return {url:new URL('./upstream-cli-agent-fixture.mjs',import.meta.url).href,shortCircuit:true};
  }
  return nextResolve(specifier,context);
}
