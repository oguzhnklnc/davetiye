import { fallbackWeather, fetchLiveWeather } from "@/app/weather.mjs";

export async function GET() {
  try {
    return Response.json(await fetchLiveWeather(), { headers: { "Cache-Control": "public, max-age=900" } });
  } catch (error) {
    console.error("weather_fetch_failed", error instanceof Error ? error.message : "unknown");
    return Response.json(fallbackWeather(), { headers: { "Cache-Control": "public, max-age=60" } });
  }
}
