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
import {
  categoryIcon,
  isVerified,
  markerVariant,
  priorityClass,
} from "@/lib/pin-visuals";
import type { ClientPin } from "@/lib/store";
import { PinPopup } from "./PinPopup";

export interface LatLng {
  lat: number;
  lng: number;
}

interface MapViewProps {
  pins: ClientPin[];
  center: LatLng;
  userLocation: LatLng | null;
  draft: LatLng | null;
  placing: boolean;
  onDraftMove: (pos: LatLng) => void;
  onAction: () => void;
}

/** Build a teardrop divIcon colored by the pin's type/status, priority and trust. */
function pinIcon(pin: ClientPin): L.DivIcon {
  const classes = [
    "rg-marker",
    `rg-marker--${markerVariant(pin)}`,
    `rg-marker--prio-${priorityClass(pin)}`,
  ];
  if (isVerified(pin)) classes.push("rg-marker--verified");
  if (pin.pending) classes.push("rg-marker--pending");
  return L.divIcon({
    className: "",
    html: `<div class="${classes.join(" ")}"><span>${categoryIcon(
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

/** Blue "you are here" dot for the device's current location. */
const meIcon = L.divIcon({
  className: "",
  html: `<div class="rg-me"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
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
  userLocation,
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
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={meIcon}
          interactive={false}
          keyboard={false}
          zIndexOffset={-1000}
        />
      )}
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
