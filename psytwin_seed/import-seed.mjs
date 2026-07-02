import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const docsDir = path.join(__dirname, "documents");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const baseUrl = (process.env.LIGHTRAG_URL || "http://localhost:9621").replace(/\/+$/, "");
const apiKey = process.env.LIGHTRAG_API_KEY || "psytwin-local-rag-key";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestJson(endpoint, options = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(options.headers || {}),
    },
  });

  const bodyText = await response.text();
  let body = null;
  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText;
    }
  }

  if (!response.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    const error = new Error(`${response.status} ${response.statusText}: ${detail}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

async function loadSeedDocuments() {
  const entries = await fs.readdir(docsDir, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "zh-CN"));

  const documents = [];
  for (const filename of markdownFiles) {
    const absolutePath = path.join(docsDir, filename);
    const text = await fs.readFile(absolutePath, "utf8");
    documents.push({
      filename,
      fileSource: `psytwin_seed/${filename}`,
      text,
      bytes: Buffer.byteLength(text, "utf8"),
    });
  }

  return documents;
}

function countBusy(statusCounts = {}) {
  const busyKeys = ["pending", "processing", "processed_failed", "failed", "running"];
  return busyKeys.reduce((sum, key) => sum + Number(statusCounts[key] || 0), 0);
}

async function waitForProcessing(timeoutMs = 30 * 60 * 1000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const status = await requestJson("/documents/status_counts");
    const counts = status?.status_counts || {};
    const busy = Number(counts.pending || 0) + Number(counts.processing || 0);
    console.log(`[wait] status_counts=${JSON.stringify(counts)}`);
    if (busy === 0) {
      return counts;
    }
    await sleep(10_000);
  }
  throw new Error("Timed out while waiting for LightRAG document processing.");
}

async function main() {
  const documents = await loadSeedDocuments();

  console.log(`PsyTwin seed import`);
  console.log(`Repo: ${repoRoot}`);
  console.log(`LightRAG URL: ${baseUrl}`);
  console.log(`Documents: ${documents.length}`);
  for (const doc of documents) {
    console.log(`- ${doc.fileSource} (${doc.bytes} bytes)`);
  }

  if (dryRun) {
    console.log("Dry run complete. No data was sent.");
    return;
  }

  await requestJson("/health");

  try {
    const result = await requestJson("/documents/texts", {
      method: "POST",
      body: JSON.stringify({
        texts: documents.map((doc) => doc.text),
        file_sources: documents.map((doc) => doc.fileSource),
        chunking: {
          strategy: "recursive_character",
          params: {
            chunk_token_size: 1000,
            chunk_overlap_token_size: 120,
          },
        },
      }),
    });
    console.log(`[insert] ${JSON.stringify(result)}`);
  } catch (error) {
    if (error.status === 409) {
      console.log("[insert] Some seed documents already exist. Skipping duplicate insert.");
      console.log(`[insert] ${error.message}`);
    } else {
      throw error;
    }
  }

  const counts = await waitForProcessing();
  const graph = await requestJson("/graphs?label=*&max_depth=3&max_nodes=1000");
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes.length : 0;
  const edges = Array.isArray(graph?.edges) ? graph.edges.length : 0;

  console.log(`[done] status_counts=${JSON.stringify(counts)}`);
  console.log(`[done] graph nodes=${nodes}, edges=${edges}`);
  console.log(`[done] Open ${baseUrl}/webui/ or ${baseUrl} to inspect the knowledge graph.`);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
