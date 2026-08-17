const weddingDate = "2026-10-24";
const descriptions: Record<number, string> = { 0: "Açık", 1: "Çoğunlukla açık", 2: "Parçalı bulutlu", 3: "Kapalı", 45: "Sisli", 48: "Kırağılı sis", 51: "Hafif çisenti", 53: "Çisenti", 55: "Yoğun çisenti", 61: "Hafif yağmurlu", 63: "Yağmurlu", 65: "Kuvvetli yağmurlu", 71: "Hafif kar yağışlı", 80: "Sağanak yağışlı", 95: "Gök gürültülü" };

export async function GET() {
  try {
    const now = new Date();
    const target = new Date("2026-10-24T19:00:00+03:00");
    const daysUntil = Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
    const inForecastWindow = daysUntil >= 0 && daysUntil <= 16;
    const params = new URLSearchParams({ latitude: "37.7648", longitude: "30.5566", timezone: "Europe/Istanbul", current: "temperature_2m,apparent_temperature,weather_code", daily: "weather_code,temperature_2m_max,temperature_2m_min", forecast_days: "16" });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: 1800 } });
    if (!response.ok) throw new Error("weather");
    const data = await response.json() as { current: { temperature_2m: number; apparent_temperature: number; weather_code: number }; daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] } };
    if (inForecastWindow) {
      const index = data.daily.time.indexOf(weddingDate);
      if (index >= 0) return Response.json({ mode: "wedding", title: `${descriptions[data.daily.weather_code[index]] ?? "Tahmin"} · ${Math.round(data.daily.temperature_2m_max[index])}°C`, summary: `Düğün günü en düşük ${Math.round(data.daily.temperature_2m_min[index])}°C, en yüksek ${Math.round(data.daily.temperature_2m_max[index])}°C bekleniyor.`, detail: "Tahminler yaklaştıkça güncellenir." });
    }
    return Response.json({ mode: "current", title: `${descriptions[data.current.weather_code] ?? "Güncel"} · ${Math.round(data.current.temperature_2m)}°C`, summary: `Isparta'da şu an hissedilen sıcaklık ${Math.round(data.current.apparent_temperature)}°C.`, detail: "Düğün tarihi tahmin aralığına girdiğinde bu alanda 24 Ekim tahmini gösterilecek." });
  } catch {
    return Response.json({ mode: "current", title: "Hava bilgisi alınamadı", summary: "Güncel tahmin kısa süre içinde yeniden denenecek.", detail: "" }, { status: 503 });
  }
}
