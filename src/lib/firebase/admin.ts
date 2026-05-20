import "server-only";
import { getApps, initializeApp, cert, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cachedApp: App | undefined;
let cachedDb: Firestore | undefined;

/**
 * Read the service account credentials, with three supported sources (first
 * match wins):
 *
 *  1. FIREBASE_SERVICE_ACCOUNT_JSON — full JSON string (best for Vercel / CI)
 *  2. GOOGLE_APPLICATION_CREDENTIALS — path to a JSON file (best for local dev)
 *  3. Application Default Credentials — works on GCP-hosted runtimes
 */
function loadCredentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      return cert(JSON.parse(raw));
    } catch (err) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_JSON is set but is not valid JSON: ${(err as Error).message}`,
      );
    }
  }
  return applicationDefault();
}

function ensureApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID env var is required");
  }
  cachedApp = initializeApp({
    credential: loadCredentials(),
    projectId,
  });
  return cachedApp;
}

export function getDb(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(ensureApp());
  return cachedDb;
}

/**
 * Returns the parsed service account JSON. Used by the Sheets client so we
 * authenticate with the same credentials.
 */
export function getServiceAccountKey(): {
  client_email: string;
  private_key: string;
  project_id: string;
} {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const parsed = JSON.parse(raw);
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      project_id: parsed.project_id,
    };
  }
  // Fall back to reading the file referenced by GOOGLE_APPLICATION_CREDENTIALS
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) {
    throw new Error(
      "Either FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS must be set",
    );
  }
  // Lazy import so this file stays import-safe in environments without fs
  // (eg, edge runtime). API routes hit it from the node runtime.
  const fs = require("node:fs") as typeof import("node:fs");
  const contents = fs.readFileSync(path, "utf8");
  const parsed = JSON.parse(contents);
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
    project_id: parsed.project_id,
  };
}
