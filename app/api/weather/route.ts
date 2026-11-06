import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { WeatherData } from "@/lib/types";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in is required." }, { status: 401 });

  const city = new URL(request.url).searchParams.get("city")?.trim() ?? "";
  if (!city || city.length > 100) {
    return NextResponse.json({ message: "Enter a valid city name." }, { status: 400 });
  }

  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) {
    return NextResponse.json({ message: "Weather service is not configured." }, { status: 503 });
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("q", city);
  url.searchParams.set("units", "metric");
  url.searchParams.set("appid", key);

  const upstream = await fetch(url, { cache: "no-store" });

  if (upstream.status === 404) {
    return NextResponse.json({ message: `Couldn't find "${city}". Check the spelling.` }, { status: 404 });
  }
  if (upstream.status === 401) {
    return NextResponse.json({ message: "The server's weather API key is invalid." }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ message: "Weather service request failed." }, { status: 502 });
  }

  const data = (await upstream.json()) as WeatherData;
  return NextResponse.json(data);
}