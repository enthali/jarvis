// Cleaner diagnostic: verify env var propagation, then try catalog lookup with real corp proxy.
console.log('[diag] process.env.HTTPS_PROXY =', process.env.HTTPS_PROXY);
console.log('[diag] process.env.HTTP_PROXY =', process.env.HTTP_PROXY);
console.log('[diag] process.env.https_proxy =', process.env.https_proxy);
console.log('[diag] process.env.http_proxy =', process.env.http_proxy);
console.log('[diag] process.env.NO_PROXY =', process.env.NO_PROXY);

const { FoundryLocalManager } = await import('foundry-local-sdk');

const manager = FoundryLocalManager.create({ appName: 'nemotron-spike-proxy-diag' });
console.log('[diag] Manager created, attempting catalog lookup...');

try {
    const model = await manager.catalog.getModel('nemotron-3.5-asr-streaming-0.6b');
    console.log('[diag] ✅ CATALOG LOOKUP SUCCESS:', model.modelId);
} catch (err) {
    console.log('[diag] ❌ CATALOG LOOKUP FAILED:', err.message);
}

process.exit(0);
