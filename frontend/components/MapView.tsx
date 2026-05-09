"use client";

import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";

type Props = {
  lat: number;
  lng: number;
  venueName?: string | null;
};

export default function MapView({ lat, lng, venueName }: Props) {
  return (
    <div className="rounded-2xl overflow-hidden h-64 w-full border border-slate-700/60">
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{ longitude: lng, latitude: lat, zoom: 15 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <div className="flex flex-col items-center gap-0.5">
            {venueName && (
              <div className="bg-emerald-500 text-slate-950 text-xs font-bold px-2.5 py-1 rounded-full shadow-lg max-w-40 truncate whitespace-nowrap">
                {venueName}
              </div>
            )}
            <span className="text-2xl drop-shadow-lg leading-none">📍</span>
          </div>
        </Marker>
      </Map>
    </div>
  );
}
