import assert from "node:assert/strict";
import test from "node:test";
import { fallbackWeather, fetchLiveWeather, formatWeather, OPEN_METEO_URL } from "../app/weather.mjs";

const current = { temperature_2m: 24.9, apparent_temperature: 23.6, weather_code: 1 };
const daily = {
  time: ["2026-10-24"],
  weather_code: [2],
  temperature_2m_max: [18.6],
  temperature_2m_min: [8.4],
};

test("Open-Meteo isteği Isparta, saat dilimi ve 16 günlük tahminle oluşturulur", () => {
  const url = new URL(OPEN_METEO_URL);
  assert.equal(url.hostname, "api.open-meteo.com");
  assert.equal(url.searchParams.get("latitude"), "37.7648");
  assert.equal(url.searchParams.get("longitude"), "30.5566");
  assert.equal(url.searchParams.get("timezone"), "Europe/Istanbul");
  assert.equal(url.searchParams.get("forecast_days"), "16");
});

test("tahmin penceresi dışında canlı güncel hava gösterilir", () => {
  assert.deepEqual(formatWeather({ current, daily }, Date.parse("2026-09-21T12:00:00Z")), {
    mode: "current",
    source: "open-meteo",
    title: "Çoğunlukla açık · 25°C",
    summary: "Isparta'da şu an hissedilen sıcaklık 24°C.",
    detail: "Düğün tarihi tahmin aralığına girdiğinde bu alanda 24 Ekim tahmini gösterilecek.",
  });
});

test("düğün tarihi tahmin penceresindeyken o günün tahmini gösterilir", () => {
  assert.deepEqual(formatWeather({ current, daily }, Date.parse("2026-10-15T12:00:00Z")), {
    mode: "wedding",
    source: "open-meteo",
    title: "Parçalı bulutlu · 19°C",
    summary: "Düğün günü en düşük 8°C, en yüksek 19°C bekleniyor.",
    detail: "Tahminler yaklaştıkça güncellenir.",
  });
});

test("canlı istek hatası reddedilir ve açıkça etiketlenmiş mevsimsel yedek hazırdır", async () => {
  await assert.rejects(fetchLiveWeather(async () => new Response("error", { status: 503 })), /Open-Meteo 503/);
  assert.equal(fallbackWeather().source, "seasonal-fallback");
});
