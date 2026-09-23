const WEDDING_DATE = "2026-10-24";
const WEDDING_TIME = Date.parse("2026-10-24T19:00:00+03:00");
const descriptions = { 0: "Açık", 1: "Çoğunlukla açık", 2: "Parçalı bulutlu", 3: "Kapalı", 45: "Sisli", 48: "Kırağılı sis", 51: "Hafif çisenti", 53: "Çisenti", 55: "Yoğun çisenti", 61: "Hafif yağmurlu", 63: "Yağmurlu", 65: "Kuvvetli yağmurlu", 71: "Hafif kar yağışlı", 80: "Sağanak yağışlı", 95: "Gök gürültülü" };

const params = new URLSearchParams({
  latitude: "37.7648",
  longitude: "30.5566",
  timezone: "Europe/Istanbul",
  current: "temperature_2m,apparent_temperature,weather_code",
  daily: "weather_code,temperature_2m_max,temperature_2m_min",
  forecast_days: "16",
});

export const OPEN_METEO_URL = `https://api.open-meteo.com/v1/forecast?${params}`;

function finite(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatWeather(data, now = Date.now()) {
  const current = data?.current;
  const daily = data?.daily;
  if (!finite(current?.temperature_2m) || !finite(current?.apparent_temperature) || !finite(current?.weather_code)) throw new Error("Geçersiz güncel hava verisi.");

  const daysUntil = Math.ceil((WEDDING_TIME - now) / 86_400_000);
  if (daysUntil >= 0 && daysUntil <= 16 && Array.isArray(daily?.time)) {
    const index = daily.time.indexOf(WEDDING_DATE);
    const code = daily?.weather_code?.[index];
    const maximum = daily?.temperature_2m_max?.[index];
    const minimum = daily?.temperature_2m_min?.[index];
    if (index >= 0 && finite(code) && finite(maximum) && finite(minimum)) {
      return {
        mode: "wedding",
        source: "open-meteo",
        title: `${descriptions[code] ?? "Tahmin"} · ${Math.round(maximum)}°C`,
        summary: `Düğün günü en düşük ${Math.round(minimum)}°C, en yüksek ${Math.round(maximum)}°C bekleniyor.`,
        detail: "Tahminler yaklaştıkça güncellenir.",
      };
    }
  }

  return {
    mode: "current",
    source: "open-meteo",
    title: `${descriptions[current.weather_code] ?? "Güncel"} · ${Math.round(current.temperature_2m)}°C`,
    summary: `Isparta'da şu an hissedilen sıcaklık ${Math.round(current.apparent_temperature)}°C.`,
    detail: "Düğün tarihi tahmin aralığına girdiğinde bu alanda 24 Ekim tahmini gösterilecek.",
  };
}

export async function fetchLiveWeather(fetchImpl = fetch, now = Date.now()) {
  const response = await fetchImpl(OPEN_METEO_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
  return formatWeather(await response.json(), now);
}

export function fallbackWeather() {
  return {
    mode: "current",
    source: "seasonal-fallback",
    title: "Mevsim normali · yaklaşık 16°C",
    summary: "Canlı hava verisine şu anda ulaşılamadı; Isparta'nın ekim sonu ortalamasına dayalı yaklaşık değer gösteriliyor.",
    detail: "Canlı tahmin bağlantısı sonraki ziyarette otomatik olarak yeniden denenecek.",
  };
}
