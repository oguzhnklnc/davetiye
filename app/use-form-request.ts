"use client";

import { useRef, useState } from "react";
import { createFormRequest } from "./form-request.mjs";

export function useFormRequest(idempotent = false) {
  const controller = useRef<ReturnType<typeof createFormRequest> | null>(null);
  controller.current ??= createFormRequest({ idempotent });
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function send(url: string, payload: Record<string, unknown>, successMessage: string, method = "POST") {
    if (controller.current!.busy) return false;
    setSending(true);
    setFeedback("");
    try {
      const result = await controller.current!.submit(url, payload, method);
      if (!result) return false;
      setFeedback(result.ok ? successMessage : result.error);
      return result.ok;
    } finally {
      setSending(false);
    }
  }

  return { sending, feedback, send };
}
