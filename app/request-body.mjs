export class RequestBodyError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "RequestBodyError";
    this.status = status;
  }
}

export async function readJsonBody(request, maxBytes) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new RequestBodyError("İstek biçimi desteklenmiyor.", 415);

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) throw new RequestBodyError("Geçersiz istek boyutu.", 400);
    if (declaredLength > maxBytes) throw new RequestBodyError("Gönderilen veri çok büyük.", 413);
  }

  if (!request.body) throw new RequestBodyError("Geçerli bir JSON nesnesi gönderin.", 400);
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError("Gönderilen veri çok büyük.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let value;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new RequestBodyError("Geçerli bir JSON nesnesi gönderin.", 400); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RequestBodyError("Geçerli bir JSON nesnesi gönderin.", 400);
  return value;
}

export function jsonBodyErrorResponse(error) {
  if (!(error instanceof RequestBodyError)) return null;
  return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
}
