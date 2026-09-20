/** One controller per form; retries keep their identity until confirmed success. */
export function createFormRequest({ idempotent = false, timeoutMs = 15000, fetchImpl = (...args) => fetch(...args) } = {}) {
  let busy = false;
  let submissionId;
  return {
    get busy() { return busy; },
    async submit(url, payload, method = "POST") {
      if (busy) return null;
      busy = true;
      const controller = new AbortController();
      let timer;
      try {
        if (idempotent) submissionId ??= crypto.randomUUID();
        const body = JSON.stringify(idempotent ? { ...payload, submissionId } : payload);
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("timeout"));
          }, timeoutMs);
        });
        const result = await Promise.race([
          (async () => {
            const response = await fetchImpl(url, {
              method, headers: { "Content-Type": "application/json" }, body,
              signal: controller.signal,
            });
            const data = await response.json();
            if (response.ok && data?.ok === true) return { ok: true, error: "" };
            const wait = Number(response.headers.get("Retry-After"));
            const error = response.status === 429 && Number.isFinite(wait) && wait > 0
              ? `Çok fazla deneme yapıldı. Yaklaşık ${Math.ceil(wait / 60)} dakika sonra yeniden deneyebilirsiniz.`
              : typeof data?.error === "string" ? data.error : "İşlem doğrulanamadı. Lütfen yeniden deneyin.";
            return { ok: false, error };
          })(),
          timeout,
        ]);
        if (result.ok) submissionId = undefined;
        return result;
      } catch {
        return { ok: false, error: "İşlemin sonucu doğrulanamadı. Bilgileriniz formda duruyor; bağlantınızı kontrol edip yeniden deneyin." };
      } finally {
        clearTimeout(timer);
        busy = false;
      }
    },
  };
}
