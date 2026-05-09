"use client";

import { useEffect, useState } from "react";
import Map, { Marker, NavigationControl, type MapMouseEvent, type MarkerDragEvent } from "react-map-gl/mapbox";

type Props = {
  initialLat: number;
  initialLng: number;
  onChange: (lat: number, lng: number) => void;
};

export default function EventLocationPicker({ initialLat, initialLng, onChange }: Props) {
  const [pin, setPin] = useState({ lat: initialLat, lng: initialLng });

  // If parent reports new coords later (e.g. geolocation resolved), sync the pin once.
  useEffect(() => {
    setPin({ lat: initialLat, lng: initialLng });
  }, [initialLat, initialLng]);

  function handleMapClick(e: MapMouseEvent) {
    const { lng, lat } = e.lngLat;
    setPin({ lat, lng });
    onChange(lat, lng);
  }

  function handleDragEnd(e: MarkerDragEvent) {
    const { lng, lat } = e.lngLat;
    setPin({ lat, lng });
    onChange(lat, lng);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-2xl overflow-hidden h-72 md:h-96 w-full border border-slate-700/60 shadow-xl shadow-black/40">
        <Map
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          initialViewState={{ longitude: initialLng, latitude: initialLat, zoom: 13 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          onClick={handleMapClick}
          cursor="crosshair"
        >
          <NavigationControl position="top-right" showCompass={false} />
          <Marker
            longitude={pin.lng}
            latitude={pin.lat}
            anchor="bottom"
            draggable
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col items-center -mb-1">
              <span className="text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">📍</span>
            </div>
          </Marker>
        </Map>
      </div>
      <p className="text-xs text-slate-400 text-center">
        Tap anywhere on the map to set the venue, or drag the pin.
        <span className="hidden sm:inline">
          {" "}— Lat <span className="font-mono text-cyan-300">{pin.lat.toFixed(5)}</span>, Lng{" "}
          <span className="font-mono text-cyan-300">{pin.lng.toFixed(5)}</span>
        </span>
      </p>
    </div>
  );
}
