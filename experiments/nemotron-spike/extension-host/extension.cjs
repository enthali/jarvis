const vscode = require('vscode');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { HttpsProxyAgent } = require('https-proxy-agent');

const modelAlias = 'nemotron-3.5-asr-streaming-0.6b';
const controlUrl = 'https://api.nuget.org/v3/index.json';
const modelAssetUrl = 'https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b/resolve/main/README.md';
const output = vscode.window.createOutputChannel('Nemotron Download Probe');
let reportPath;

function hostPort(value) {
  if (!value) { return 'unset'; }
  try { const url = new URL(value); return `${url.protocol}//${url.host}`; } catch { return 'unparsable'; }
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  output.appendLine(line);
  fs.appendFileSync(reportPath, `${line}\n`);
}

function checkHttp(agent) {
  return new Promise((resolve, reject) => {
    const request = https.get(controlUrl, { agent, timeout: 15000 }, response => {
      response.resume();
      response.on('end', () => resolve(`HTTP ${response.statusCode}`));
    });
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', reject);
  });
}

function downloadModelAsset(url, agent, redirects = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { agent, timeout: 15000 }, response => {
      if (response.statusCode === 307 || response.statusCode === 302) {
        response.resume();
        const nextUrl = new URL(response.headers.location, url);
        if (redirects >= 5 || nextUrl.hostname !== 'huggingface.co') {
          reject(new Error('unexpected model asset redirect'));
        } else {
          resolve(downloadModelAsset(nextUrl, agent, redirects + 1));
        }
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', reject);
  });
}

async function run(context) {
  output.show(true);
  fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
  reportPath = path.join(context.globalStorageUri.fsPath, 'probe.log');
  const settings = vscode.workspace.getConfiguration('http');
  const proxy = settings.get('proxy', '');
  log(`Extension Host: ${process.platform}/${process.arch}, Node ${process.version}`);
  log(`http.proxy configured: ${Boolean(proxy)}; http.proxySupport: ${settings.get('proxySupport')}`);
  log(`inherited env: HTTPS_PROXY=${hostPort(process.env.HTTPS_PROXY)} HTTP_PROXY=${hostPort(process.env.HTTP_PROXY)} NO_PROXY set=${Boolean(process.env.NO_PROXY)}`);
  log(`http.proxy setting: ${hostPort(proxy)}`);
  if (proxy) {
    // VS Code's own dictation does this before the SDK runs; the native layer reads env, not settings.
    process.env.HTTPS_PROXY = proxy;
    process.env.HTTP_PROXY = proxy;
    log(`env bridged from http.proxy: HTTPS_PROXY=${hostPort(process.env.HTTPS_PROXY)}`);
  }

  for (const [label, agent] of [
    ['Node HTTPS direct', undefined],
    ...(proxy ? [['Node HTTPS with explicit VS Code proxy', new HttpsProxyAgent(proxy)]] : []),
  ]) {
    try {
      log(`${label}: ${await checkHttp(agent)}`);
    } catch (error) {
      log(`${label}: FAILED ${error.message}`);
    }
  }

  try {
    const asset = await downloadModelAsset(modelAssetUrl, proxy ? new HttpsProxyAgent(proxy) : undefined);
    fs.writeFileSync(path.join(context.globalStorageUri.fsPath, 'nemotron-readme.md'), asset);
    log(`Nemotron repository asset via configured proxy: downloaded ${asset.length} bytes`);
  } catch (error) {
    log(`Nemotron repository asset: FAILED ${error.message}`);
  }

  let manager;
  try {
    const { FoundryLocalManager } = await import('foundry-local-sdk');
    manager = FoundryLocalManager.create({
      appName: 'nemotron-extension-host-probe',
      modelCacheDir: path.join(context.globalStorageUri.fsPath, 'model-cache'),
      logsDir: path.join(context.globalStorageUri.fsPath, 'sdk-logs'),
      logLevel: 'debug',
    });
    log('SDK online catalog: listing models...');
    const models = await manager.catalog.getModels();
    log(`SDK online catalog: ${models.length} models; Nemotron matches: ${models.filter(model => model.id.includes('nemotron')).map(model => model.id).join(', ') || 'none'}`);
    log('SDK online catalog: looking up Nemotron...');
    const model = await manager.catalog.getModel(modelAlias);
    log(`SDK catalog: resolved ${model.id}; cached: ${model.isCached}`);
    if (model.isCached) {
      log('SDK download skipped: model is already cached; this does not prove network download works.');
      return;
    }
    log('SDK download: starting...');
    await model.download(progress => log(`SDK download: ${Math.round(progress)}%`));
    log(`SDK download: completed; cached: ${model.isCached}`);
  } catch (error) {
    log(`SDK catalog/download: FAILED ${error.stack || error.message}`);
  } finally {
    manager?.dispose();
  }
}

function activate(context) {
  context.subscriptions.push(output, vscode.commands.registerCommand('nemotronProbe.run', () => run(context)));
  run(context).catch(error => log(`Probe: FAILED ${error.message}`));
}

module.exports = { activate };