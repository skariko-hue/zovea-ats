import fs from 'node:fs';
import path from 'node:path';

export const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
export const UPLOAD_CLINIC_DIR = path.join(UPLOAD_ROOT, 'clinic');
export const UPLOAD_CANDIDATE_DIR = path.join(UPLOAD_ROOT, 'candidate');

export function ensureUploadDirs() {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  fs.mkdirSync(UPLOAD_CLINIC_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_CANDIDATE_DIR, { recursive: true });
}

export function safeStoredName(originalName) {
  const base = originalName.replace(/[^a-zA-Z0-9.\-_ ]/g, '_').slice(0, 80);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(16).slice(2, 10);
  return `${stamp}-${rand}-${base}`;
}

