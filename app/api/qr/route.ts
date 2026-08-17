import QRCode from "qrcode";

export async function GET(request: Request) {
  const target = `${new URL(request.url).origin}/#anilar`;
  const image = await QRCode.toBuffer(target, { type: "png", width: 336, margin: 2, color: { dark: "#76283d", light: "#fffaf0" }, errorCorrectionLevel: "M" });
  const body = new Uint8Array(image).buffer as ArrayBuffer;
  return new Response(body, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
}
