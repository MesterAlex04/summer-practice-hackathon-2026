"use client";

import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import { SPORT_EMOJI, type Sport } from "@/lib/sports";

export type MapPin = {
  id: string;
  sport: string;
  venue: string;
  lat: number;
  lng: number;
};

type Props = {
  pins: MapPin[];
  centerLat: number;
  centerLng: number;
  userLat?: number;
  userLng?: number;
};

export default function EventsMapView({ pins, centerLat, centerLng, userLat, userLng }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden h-72 w-full border border-slate-700/60">
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ longitude: centerLng, latitude: centerLat, zoom: 13 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      >
        <NavigationControl position="top-right" showCompass={false} />

        {/* User's own location pin */}
        {userLat !== undefined && userLng !== undefined && (
          <Marker longitude={userLng} latitude={userLat} anchor="center">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg ring-4 ring-blue-500/30" />
          </Marker>
        )}

        {/* Event pins */}
        {pins.map((pin) => {
          const emoji = SPORT_EMOJI[pin.sport as Sport] ?? "🏅";
          return (
            <Marker key={pin.id} longitude={pin.lng} latitude={pin.lat} anchor="bottom">
              <div className="flex flex-col items-center gap-0.5">
                <div className="bg-emerald-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg max-w-28 truncate whitespace-nowrap leading-tight">
                  {pin.venue}
                </div>
                <span className="text-xl drop-shadow-lg leading-none">{emoji}</span>
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
