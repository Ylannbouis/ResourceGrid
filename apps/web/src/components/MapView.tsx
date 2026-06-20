"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { Pin } from "@resourcegrid/shared";
import { categoryIcon, markerVariant } from "@/lib/pin-visuals";
import { PinPopup } from "./PinPopup";

export interface LatLng {
  lat: number;
  lng: number;
}

interface MapViewProps {
  pins: Pin[];
  center: LatLng;
  draft: LatLng | null;
  placing: boolean;
  onDraftMove: (pos: LatLng) => void;
  onAction: () => void;
}

/** Build a teardrop divIcon colored by the pin's type/status. */
function pinIcon(pin: Pin): L.DivIcon {
  const variant = markerVariant(pin);
  return L.divIcon({
    className: "",
    html: `<div class="rg-marker rg-marker--${variant}"><span>${categoryIcon(
      pin.category,
    )}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 31],
    popupAnchor: [0, -30],
  });
}

const draftIcon = L.divIcon({
  className: "",
  html: `<div class="rg-marker rg-marker--claimed animate-bounce"><span>📌</span></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 31],
});

/** Recenters the map when geolocation resolves to a new center. */
function Recenter({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng]);
  }, [center.lat, center.lng, map]);
  return null;
}

/** While drafting, a tap on the map (re)places the draft marker. */
function DraftPlacer({
  active,
  onPlace,
}: {
  active: boolean;
  onPlace: (pos: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (active) onPlace({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapView({
  pins,
  center,
  draft,
  placing,
  onDraftMove,
  onAction,
}: MapViewProps) {
  const markers = useMemo(
    () =>
      pins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pinIcon(pin)}>
          <Popup>
            <PinPopup pin={pin} onAction={onAction} />
          </Popup>
        </Marker>
      )),
    [pins, onAction],
  );

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      <DraftPlacer active={placing} onPlace={onDraftMove} />
      {markers}
      {draft && (
        <Marker
          position={[draft.lat, draft.lng]}
          icon={draftIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              onDraftMove({ lat, lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
