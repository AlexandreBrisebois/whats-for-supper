(function (scope) {
  'use strict';
  const MAX_FILE = 20 * 1024 * 1024;
  const MAX_ENVELOPE = MAX_FILE + 65536;
  const ORPHAN_MS = 10 * 60 * 1000; // Cleanup bound, never a draft-resume promise.
  const DB = 'wfs-pdf-share-v1';
  function open() {
    return new Promise((resolve, reject) => {
      const request = scope.indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('shares');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Share storage blocked.'));
    });
  }
  async function transaction(action) {
    const db = await open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('shares', 'readwrite');
        let result = null;
        tx.oncomplete = () => resolve(result);
        tx.onerror = tx.onabort = () => reject(tx.error || new Error('Share storage unavailable.'));
        action(tx.objectStore('shares'), (value) => { result = value; });
      });
    } finally { db.close(); }
  }
  function valid(file) {
    return file && typeof file !== 'string' && file.name.toLowerCase().endsWith('.pdf')
      && file.type.toLowerCase() === 'application/pdf' && file.size > 0 && file.size <= MAX_FILE;
  }
  async function stage(file) {
    if (!valid(file)) throw new Error('Invalid shared PDF.');
    const token = scope.crypto.randomUUID();
    await transaction((store) => { store.put({ token, file, createdAt: Date.now() }, 'pending'); });
    return token;
  }
  async function claim(token) {
    return transaction((store, result) => {
      const read = store.get('pending');
      read.onsuccess = () => {
        const entry = read.result;
        if (!entry || entry.token !== token) return;
        store.delete('pending');
        if (Date.now() - entry.createdAt <= ORPHAN_MS && valid(entry.file)) result({ token, file: entry.file });
      };
    });
  }
  async function discard(token) {
    await transaction((store) => {
      const read = store.get('pending');
      read.onsuccess = () => { if (read.result?.token === token) store.delete('pending'); };
    });
  }
  async function cleanup() {
    await transaction((store) => {
      const read = store.get('pending');
      read.onsuccess = () => { if (read.result && Date.now() - read.result.createdAt > ORPHAN_MS) store.delete('pending'); };
    });
  }
  async function formWithinBound(request) {
    const declared = Number(request.headers.get('content-length'));
    if (declared > MAX_ENVELOPE) throw new Error('Share envelope too large.');
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Share body missing.');
    const chunks = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ENVELOPE) { await reader.cancel(); throw new Error('Share envelope too large.'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type') || '' } }).formData();
  }
  const api = {
    stage, claim, discard, cleanup,
    matches(request) {
      const url = new URL(request.url);
      return request.method === 'POST' && url.origin === scope.location.origin && url.pathname === '/share-target';
    },
    async handle(request) {
      try {
        const form = await formWithinBound(request);
        const files = [...form.values()].filter((value) => typeof value !== 'string');
        if (files.length === 0) {
          const params = new URLSearchParams();
          for (const key of ['title', 'text', 'url']) {
            const value = form.get(key);
            if (typeof value === 'string') params.set(key, value);
          }
          return new Response(null, { status: 303, headers: { Location: '/capture?' + params.toString() } });
        }
        if (files.length !== 1 || form.getAll('files').length !== 1 || !valid(files[0]))
          throw new Error('Choose one PDF.');
        // Commit the slot before redirecting. The worker never renders or calls the capture API.
        const token = await api.stage(files[0]);
        return new Response(null, { status: 303, headers: { Location: '/capture?share=' + encodeURIComponent(token) } });
      } catch {
        return new Response(null, { status: 303, headers: { Location: '/capture?pdfShareError=restart' } });
      }
    },
  };
  scope.WfsPdfShare = api;
})(globalThis);
