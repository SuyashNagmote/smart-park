<script lang="ts">
import { onMount, tick } from 'svelte';
import { page } from '$app/state';
import type { ParkingLot } from '$lib/server/lots';
import gsap from 'gsap';
import { initRealtime, refreshAll, state as appState, bus, book as bookAction } from '$lib/client/state';
import BookingConfirmedOverlay from '$lib/components/BookingConfirmedOverlay.svelte';
import ParkingRush from '$lib/components/ParkingRush.svelte';
import OnboardingModal from '$lib/components/OnboardingModal.svelte';
import DashSidebar from '$lib/components/dashboard/DashSidebar.svelte';
import DashBottomNav from '$lib/components/dashboard/DashBottomNav.svelte';
import DashTopBar from '$lib/components/dashboard/DashTopBar.svelte';
import SessionCockpit from '$lib/components/dashboard/SessionCockpit.svelte';
import HomeTab from '$lib/components/dashboard/HomeTab.svelte';
import MapTab from '$lib/components/dashboard/MapTab.svelte';
import BookingsTab from '$lib/components/dashboard/BookingsTab.svelte';
import ProfileTab from '$lib/components/dashboard/ProfileTab.svelte';
import BookingModal from '$lib/components/dashboard/BookingModal.svelte';

// ── State ────────────────────────────────────────────────────
let mapContainer = $state<HTMLDivElement | undefined>(undefined);
let selectedLotId = $state<string | null>(null);
let search = $state('');
let status = $state<'connecting' | 'connected' | 'offline'>('connecting');
let lastUpdatedAt = $state<string>('');
let tab = $state<'home' | 'map' | 'bookings' | 'profile'>('map');

let filterMode = $state<'all' | 'available' | 'ev'>('all');
let userPos = $state<{ lat: number; lon: number } | null>(null);
let targetPos = $state<{ lat: number; lon: number } | null>(null);

let bookingOpen = $state(false);
let bookingDuration = $state(2);
let bookingVehicle = $state<'car' | 'ev'>('car');
let bookingNeedsCharging = $state(false);
let bookingBusy = $state(false);
let bookingStartTime = $state<number>(Date.now());
let toast = $state<{ title: string; message?: string } | null>(null);
let celebration = $state<{ receiptCode: string; xp: number } | null>(null);
let burstKey = $state(0);
let bookingSlot = $state<number | null>(null);

let bookingStep = $state<1 | 2 | 3>(1);
let bookingError = $state<string | null>(null);
let bookingModalEl: HTMLDivElement | undefined = $state();

let parkingLots = $state<ParkingLot[]>([]);
let liveEvents = $state<{ type: string; lot: ParkingLot; timestamp: string }[]>([]);
let errorMessage = $state<string | null>(null);
let reservations = $state<any[]>([]);
let stats = $state<{ xp: number; level: number; streakDays: number; badges: string[] } | null>(null);
let lastXpAwarded = $state<number | null>(null);
let quests = $state<any | null>(null);
let undo = $state<{ id: string; title: string; message?: string; undo: () => void | Promise<void> } | null>(null);

let rescheduleOpen = $state(false);
let rescheduleBusy = $state(false);
let rescheduleTarget = $state<any | null>(null);
let rescheduleStart = $state<string>('');
let rescheduleDuration = $state(2);
let rescheduleSlot = $state<number | null>(null);
let reschedulePriceId = $state<'standard' | 'flex' | 'green'>('standard');

let activeNowMs = $state<number>(Date.now());
let cockpitBusy = $state(false);
let parkingRushOpen = $state(false);

let lotsLoading = $state(true);
let reservationsLoading = $state(true);
let reservationsError = $state<string | null>(null);
let liveActivityOpen = $state(true);

let currentTheme = $state<'light' | 'dark'>('dark');
let showOnboarding = $state(false);

// ── Map state ────────────────────────────────────────────────
let map: any;
let tileLayerRef: any = null;
let markers: Record<string, any> = {};
let targetMarker: any | null = null;
let clusterLayer: any | null = null;
let heatLayer: any | null = null;
let drawLayer: any | null = null;
let showHeat = $state(false);
let boundsDirty = $state(false);
let areaBounds = $state<any | null>(null);
let pinMode = $state<'none' | 'home' | 'work'>('none');
let homePin = $state<{ lat: number; lon: number } | null>(null);
let workPin = $state<{ lat: number; lon: number } | null>(null);
let homeMarker: any | null = null;
let workMarker: any | null = null;

let mapReady = $state(false);
let mapInitError = $state<string | null>(null);
let mapUiCompact = $state(false);
let mapBottomCollapsed = $state(true);

let selectedPriceId = $state<'standard' | 'flex' | 'green'>('standard');

// ── Derived ──────────────────────────────────────────────────
let selectedLotData = $derived(selectedLotId ? parkingLots.find((x) => x.id === selectedLotId) ?? null : null);
let suggestion = $derived(suggestedLot());

// ── Utility functions ────────────────────────────────────────
function fmtHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  return `${mm}:${String(ss).padStart(2, '0')}`;
}

function getActiveSession() {
  const r = reservations.find((x: any) => x?.sessionStatus === 'active');
  if (!r) return null;
  const startedAt = r.sessionStartedAt ? Number(r.sessionStartedAt) : null;
  const elapsedMs = startedAt ? Math.max(0, activeNowMs - startedAt) : 0;
  const elapsedHr = elapsedMs / (60 * 60 * 1000);
  const liveCost = Math.max(0, Math.round(Number(r.pricePerHour) * elapsedHr));
  const endsAt = Number(r.startTime) + Number(r.durationHours) * 60 * 60 * 1000;
  const remainingMs = Math.max(0, endsAt - activeNowMs);
  return { r, elapsedMs, liveCost, remainingMs };
}

function toggleTheme() {
  const next = currentTheme === 'dark' ? 'light' : 'dark';
  currentTheme = next;
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('sp_theme', next); } catch {}

  // Swap map tile layer to match the new theme
  if (map && tileLayerRef) {
    try { map.removeLayer(tileLayerRef); } catch {}
  }
  if (map) {
    const url = next === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    const L = (window as any)._leaflet_L;
    if (L) {
      tileLayerRef = L.tileLayer(url, { maxZoom: 19, subdomains: 'abcd' });
      tileLayerRef.addTo(map);
    }
  }
}

function showToast(title: string, message?: string) {
  toast = { title, message };
  setTimeout(() => { toast = null; }, 4000);
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const aa = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

function filteredLots(): ParkingLot[] {
  let lots = parkingLots;

  if (areaBounds) {
    lots = lots.filter((l) => {
      try { return areaBounds.contains?.([l.lat, l.lon]); } catch { return true; }
    });
  }

  if (filterMode === 'available') {
    lots = lots.filter((l) => (l.available ?? 0) > 0);
  } else if (filterMode === 'ev') {
    lots = lots.filter((l) => l.ev);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    lots = lots.filter((l) => l.name.toLowerCase().includes(q) || l.area.toLowerCase().includes(q));
  }

  if (userPos) {
    lots = [...lots].sort((a, b) => haversineKm(userPos!, a) - haversineKm(userPos!, b));
  }

  return lots;
}

function suggestedLot(): ParkingLot | null {
  const lots = parkingLots.filter((l) => (l.available ?? 0) > 0);
  if (lots.length === 0) return null;

  const ref = targetPos ?? userPos;
  if (ref) {
    const withDist = lots.map((l) => ({ l, d: haversineKm(ref, l) }));
    withDist.sort((a, b) => {
      const score = (x: { l: ParkingLot; d: number }) => {
        let s = x.d * 10;
        s -= (x.l.available ?? 0) * 0.5;
        s += (x.l.hourlyRate ?? 50) * 0.02;
        if (bookingVehicle === 'ev' && x.l.ev) s -= 5;
        return s;
      };
      return score(a) - score(b);
    });
    return withDist[0]?.l ?? null;
  }

  return lots.reduce((best, l) => {
    if (!best) return l;
    const bScore = (best.available ?? 0) - (best.hourlyRate ?? 50) * 0.01;
    const lScore = (l.available ?? 0) - (l.hourlyRate ?? 50) * 0.01;
    return lScore > bScore ? l : best;
  }, null as ParkingLot | null);
}

function optionPrices(lot: ParkingLot) {
  const base = lot.hourlyRate ?? 50;
  const surge = Math.max(0, Math.round(base * 0.18));
  const greenDiscount = lot.ev ? Math.round(base * 0.08) : 0;
  return [
    { id: 'standard', label: 'Standard', perHour: base },
    { id: 'flex', label: 'Flex', perHour: base + surge },
    { id: 'green', label: 'Green Saver', perHour: Math.max(10, base - greenDiscount) },
  ];
}

// ── Map functions ────────────────────────────────────────────
function markerHtml(available: number, level: number, ping: boolean) {
  const color = available === 0 ? '#f87171' : available < 5 ? '#f59e0b' : '#22c55e';
  const pingClass = ping ? 'sp-ping' : '';
  return `<div class="${pingClass}" style="width:36px;height:36px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.7);display:grid;place-items:center;font-size:11px;font-weight:800;color:#05210f;box-shadow:0 4px 12px rgba(0,0,0,0.3);">${available}</div>`;
}

function renderMarkers(L: any) {
  if (!map) return;
  const lots = filteredLots();

  // Remove markers for lots no longer in filtered list
  const filteredIds = new Set(lots.map((l) => l.id));
  for (const [id, m] of Object.entries(markers)) {
    if (!filteredIds.has(id)) {
      try { clusterLayer ? clusterLayer.removeLayer(m) : map.removeLayer(m); } catch {}
      delete markers[id];
    }
  }

  for (const lot of lots) {
    const icon = L.divIcon({ html: markerHtml(lot.available ?? 0, 0, false), className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
    if (markers[lot.id]) {
      markers[lot.id].setIcon(icon);
    } else {
      const m = L.marker([lot.lat, lot.lon], { icon });
      m.on('click', () => { selectedLotId = lot.id; });
      if (clusterLayer) clusterLayer.addLayer(m);
      else m.addTo(map);
      markers[lot.id] = m;
    }
  }
}

function updateHeat(L: any) {
  if (!map) return;
  if (heatLayer) { try { map.removeLayer(heatLayer); } catch {} heatLayer = null; }
  if (!showHeat) return;
  const points = parkingLots.map((l) => [l.lat, l.lon, (l.available ?? 0) / Math.max(1, l.capacity)]);
  try {
    // @ts-ignore
    heatLayer = (L as any).heatLayer?.(points, { radius: 25, blur: 15, maxZoom: 17 });
    if (heatLayer) heatLayer.addTo(map);
  } catch {}
}

function setTargetMarker(L: any, lat: number, lon: number) {
  if (!map) return;
  if (targetMarker) { try { map.removeLayer(targetMarker); } catch {} }
  const icon = L.divIcon({
    html: '<div style="width:20px;height:20px;border-radius:50%;background:#38bdf8;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>',
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
  targetMarker = L.marker([lat, lon], { icon }).addTo(map);
}

function setNamedPinMarker(L: any, lat: number, lon: number, label: string) {
  if (!map) return;
  const icon = L.divIcon({
    html: `<div style="padding:4px 8px;border-radius:8px;background:#22c55e;color:#05210f;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${label}</div>`,
    className: '',
    iconAnchor: [0, 0],
  });
  return L.marker([lat, lon], { icon }).addTo(map);
}

// ── Data functions ───────────────────────────────────────────
async function refreshReservationsAndStats() {
  reservationsLoading = true;
  reservationsError = null;
  try {
    const [rRes, sRes, qRes] = await Promise.all([
      fetch('/api/reservations'),
      fetch('/api/reservations?type=stats'),
      fetch('/api/quests'),
    ]);
    const rData = await rRes.json();
    const sData = await sRes.json();
    const qData = await qRes.json();
    if (rData.reservations) reservations = rData.reservations;
    if (sData.stats) stats = sData.stats;
    quests = qData ?? null;
  } catch {
    reservationsError = 'Could not load bookings.';
  } finally {
    reservationsLoading = false;
  }
}

// ── Booking functions ────────────────────────────────────────
async function bookSelectedLot() {
  if (!selectedLotData) return;
  bookingError = null;
  bookingOpen = true;
  await tick();
  if (bookingModalEl) {
    gsap.fromTo(bookingModalEl, { opacity: 0, scale: 0.96, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power2.out' });
  }
}

async function confirmBooking() {
  if (!selectedLotData) return;
  bookingBusy = true;
  bookingError = null;
  try {
    const result = await bookAction({
      lot: selectedLotData,
      vehicleType: bookingVehicle,
      needsCharging: bookingNeedsCharging,
      slotNumber: bookingSlot,
      durationHours: bookingDuration,
      priceId: selectedPriceId,
      startTime: bookingStartTime,
    });
    if (result.ok) {
      closeBookingModal();
    } else {
      bookingError = result.error ?? 'Booking failed.';
    }
  } catch (e: any) {
    bookingError = String(e?.message ?? e);
  } finally {
    bookingBusy = false;
  }
}

function closeBookingModal() {
  if (bookingModalEl) {
    gsap.to(bookingModalEl, {
      opacity: 0, scale: 0.96, y: 8, duration: 0.16, ease: 'power2.in',
      onComplete: () => { bookingOpen = false; bookingStartTime = Date.now(); },
    });
  } else {
    bookingOpen = false;
    bookingStartTime = Date.now();
  }
}

function handleBookingKeydown(e: KeyboardEvent) {
  if (!bookingOpen) return;
  if (e.key === 'Escape') { closeBookingModal(); return; }
  if (e.key === 'Tab' && bookingModalEl) {
    const focusable = bookingModalEl.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }
}

// ── Session functions ────────────────────────────────────────
async function cancelBooking(id: string) {
  const prev = [...reservations];
  reservations = reservations.map((r: any) => r.id === id ? { ...r, status: 'cancelled' } : r);
  undo = {
    id: `cancel:${id}`,
    title: 'Cancelled',
    message: 'Undo?',
    undo: async () => {
      reservations = prev;
      undo = null;
    },
  };
  setTimeout(() => { if (undo?.id === `cancel:${id}`) undo = null; }, 5000);
  await fetch('/api/reservations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cancel', reservationId: id }),
  }).catch(() => {});
  await refreshReservationsAndStats();
}

function openReschedule(r: any) {
  rescheduleTarget = r;
  rescheduleStart = new Date(Number(r.startTime)).toISOString().slice(0, 16);
  rescheduleDuration = r.durationHours;
  rescheduleSlot = r.slotNumber ?? null;
  reschedulePriceId = r.priceId ?? 'standard';
  rescheduleOpen = true;
}

async function submitReschedule() {
  if (!rescheduleTarget) return;
  rescheduleBusy = true;
  try {
    await fetch('/api/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reschedule',
        reservationId: rescheduleTarget.id,
        startTime: new Date(rescheduleStart).getTime(),
        durationHours: rescheduleDuration,
        slotNumber: rescheduleSlot,
        priceId: reschedulePriceId,
      }),
    });
    rescheduleOpen = false;
    rescheduleTarget = null;
    await refreshReservationsAndStats();
    showToast('Rescheduled', 'Your booking has been updated.');
  } catch {
    showToast('Error', 'Could not reschedule. Please try again.');
  } finally {
    rescheduleBusy = false;
  }
}

async function startSession(r: any) {
  await fetch('/api/reservations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start_session', reservationId: r.id }),
  }).catch(() => {});
  await refreshReservationsAndStats();
}

async function stopSession(r: any) {
  await fetch('/api/reservations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'stop_session', reservationId: r.id }),
  }).catch(() => {});
  await refreshReservationsAndStats();
}

// ── Effects ──────────────────────────────────────────────────
$effect(() => {
  if (tab === 'map' && map) {
    tick().then(() => { try { map.invalidateSize(); } catch {} });
  }
});

// ── onMount ──────────────────────────────────────────────────
onMount(() => {
  // Theme
  try {
    const saved = localStorage.getItem('sp_theme') as 'light' | 'dark' | null;
    if (saved) {
      currentTheme = saved;
      document.documentElement.dataset.theme = saved;
    }
  } catch {}

  // Onboarding
  try {
    const onboarded = localStorage.getItem('sp_onboarded');
    if (!onboarded) showOnboarding = true;
  } catch {}

  // Active session clock
  const clockInterval = setInterval(() => { activeNowMs = Date.now(); }, 1000);

  // Subscribe to app state
  const unsub = appState.subscribe((s) => {
    parkingLots = s.lots;
    liveEvents = s.liveEvents;
    status = s.connection;
    lastUpdatedAt = s.lastUpdatedAt;
    reservations = s.reservations;
    stats = s.stats;
    quests = s.quests;
    if (s.lots.length > 0) lotsLoading = false;
    if (s.reservations.length >= 0) reservationsLoading = false;
  });

  // Subscribe to bus events
  const unsubBus = bus.on((ev: any) => {
    if (ev.type === 'toast') showToast(ev.title, ev.message);
    if (ev.type === 'celebrate') {
      celebration = { receiptCode: ev.receiptCode, xp: ev.xp };
      burstKey++;
      setTimeout(() => { celebration = null; }, 3500);
    }
    if (ev.type === 'undoable') {
      undo = ev;
      setTimeout(() => { if (undo?.id === ev.id) undo = null; }, 5000);
    }
  });

  // Init realtime
  initRealtime();
  refreshAll();

  // Geolocation
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => { 
        userPos = { lat: pos.coords.latitude, lon: pos.coords.longitude }; 
        refreshAll(userPos.lat, userPos.lon); // Fetch local lots immediately!
      },
      () => {},
      { timeout: 8000 }
    );
  }

  // Init Leaflet map (async)
  let renderInterval: ReturnType<typeof setInterval> | null = null;
  let unsubLots: (() => void) | null = null;

  (async () => {
    try {
      const L = (await import('leaflet')).default;
      await import('leaflet.markercluster');

      if (!mapContainer) {
        mapInitError = 'Map container not found.';
        return;
      }

      map = L.map(mapContainer, { zoomControl: true, attributionControl: false });
      const tileUrl = currentTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      tileLayerRef = L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);
      // Expose L for theme toggle
      (window as any)._leaflet_L = L;

      // @ts-ignore
      clusterLayer = (L as any).markerClusterGroup?.({ maxClusterRadius: 40, disableClusteringAtZoom: 16 });
      if (clusterLayer) clusterLayer.addTo(map);

      map.setView([18.5204, 73.8567], 13);

      map.on('moveend', () => { boundsDirty = true; });
      map.on('click', async (e: any) => {
        if (pinMode === 'none') return;
        const { lat, lng } = e.latlng;
        if (pinMode === 'home') {
          homePin = { lat, lon: lng };
          if (homeMarker) { try { map.removeLayer(homeMarker); } catch {} }
          homeMarker = setNamedPinMarker(L, lat, lng, 'Home');
          try { localStorage.setItem('sp_homePin', JSON.stringify(homePin)); } catch {}
        } else if (pinMode === 'work') {
          workPin = { lat, lon: lng };
          if (workMarker) { try { map.removeLayer(workMarker); } catch {} }
          workMarker = setNamedPinMarker(L, lat, lng, 'Work');
          try { localStorage.setItem('sp_workPin', JSON.stringify(workPin)); } catch {}
        }
        pinMode = 'none';
      });

      mapReady = true;

      // Load saved pins
      try {
        const hp = localStorage.getItem('sp_homePin');
        if (hp) { homePin = JSON.parse(hp); homeMarker = setNamedPinMarker(L, homePin!.lat, homePin!.lon, 'Home'); }
        const wp = localStorage.getItem('sp_workPin');
        if (wp) { workPin = JSON.parse(wp); workMarker = setNamedPinMarker(L, workPin!.lat, workPin!.lon, 'Work'); }
      } catch {}

      // Render markers when lots load
      renderInterval = setInterval(() => {
        if (parkingLots.length > 0) renderMarkers(L);
      }, 2000);
      if (parkingLots.length > 0) renderMarkers(L);

      // Watch lots for marker updates
      unsubLots = appState.subscribe((s) => {
        if (s.lots.length > 0 && mapReady) renderMarkers(L);
      });
    } catch (e: any) {
      mapInitError = String(e?.message ?? 'Map failed to load.');
    }
  })();

  // Return cleanup function from onMount
  return () => {
    clearInterval(clockInterval);
    unsub();
    unsubBus();
    if (renderInterval) clearInterval(renderInterval);
    if (unsubLots) unsubLots();
    try { map?.remove(); } catch {}
  };
});
</script>

<svelte:head><title>Dashboard | Smart Park</title></svelte:head>
<svelte:window onkeydown={handleBookingKeydown} />

{#if showOnboarding}
  <OnboardingModal onClose={() => (showOnboarding = false)} />
{/if}

<div class="dash-shell">
  <DashSidebar {tab} {stats} {currentTheme} onTabChange={(t) => (tab = t)} onToggleTheme={toggleTheme} />

  <div class="dash-main">
    <DashTopBar email={page.data.user?.email} level={stats?.level ?? 1} {currentTheme} onToggleTheme={toggleTheme} hidden={tab === 'map'} />

    <div class="dash-content" class:is-map-tab={tab === 'map'}>
      {#if getActiveSession() !== null}
        {@const s = getActiveSession()!}
        <SessionCockpit
          session={s}
          busy={cockpitBusy}
          onStop={async () => {
            cockpitBusy = true;
            try { await stopSession(s.r); } finally { cockpitBusy = false; }
          }}
        />
      {/if}

      {#if tab === 'home'}
        <HomeTab
          {stats}
          suggestion={suggestion}
          {liveEvents}
          {liveActivityOpen}
          {parkingRushOpen}
          {userPos}
          onFindLots={() => (tab = 'map')}
          onViewBookings={() => (tab = 'bookings')}
          onPlayRush={() => (parkingRushOpen = true)}
          onViewLot={(lot) => {
            selectedLotId = lot.id;
            tab = 'map';
            map?.setView([lot.lat, lot.lon], Math.max(map?.getZoom?.() ?? 13, 15), { animate: true });
          }}
          onBookLot={(lot) => {
            selectedLotId = lot.id;
            tab = 'map';
            void bookSelectedLot();
          }}
          onToggleLiveActivity={() => (liveActivityOpen = !liveActivityOpen)}
        />
      {/if}

      {#if tab === 'map'}
        <MapTab
          bind:mapContainer
          {parkingLots}
          filteredLots={filteredLots()}
          {selectedLotId}
          {search}
          {filterMode}
          {status}
          {lastUpdatedAt}
          {errorMessage}
          {lotsLoading}
          {liveEvents}
          {mapReady}
          {mapInitError}
          {showHeat}
          {boundsDirty}
          {areaBounds}
          {pinMode}
          {mapBottomCollapsed}
          {selectedLotData}
          onSelectLot={(id) => {
            selectedLotId = id;
            const lot = parkingLots.find((l) => l.id === id);
            if (lot) map?.setView([lot.lat, lot.lon], Math.max(map?.getZoom?.() ?? 13, 15), { animate: true });
          }}
          onSearch={(v) => (search = v)}
          onFilterChange={(f) => (filterMode = f)}
          onClearTarget={() => {
            targetPos = null;
            if (targetMarker) {
              try { map?.removeLayer?.(targetMarker); } catch {}
              targetMarker = null;
            }
          }}
          onToggleHeat={async () => {
            showHeat = !showHeat;
            const L = (await import('leaflet')).default;
            updateHeat(L);
          }}
          onSetPinMode={(m) => (pinMode = m)}
          onSearchArea={() => { areaBounds = map?.getBounds?.() ?? null; boundsDirty = false; }}
          onClearArea={() => (areaBounds = null)}
          onToggleDetails={() => (mapBottomCollapsed = !mapBottomCollapsed)}
          onBook={bookSelectedLot}
          onRetryLots={async () => {
            errorMessage = null;
            lotsLoading = true;
            try {
              const url = userPos ? `/api/lots?lat=${userPos.lat}&lon=${userPos.lon}` : '/api/lots';
              const res = await fetch(url);
              const data = await res.json();
              if (data.lots) parkingLots = data.lots;
            } catch {
              errorMessage = 'Could not load parking lots. Please try again.';
            } finally {
              lotsLoading = false;
            }
          }}
        />
      {/if}

      {#if tab === 'bookings'}
        <BookingsTab
          {reservations}
          {reservationsLoading}
          {reservationsError}
          {quests}
          {activeNowMs}
          onRefresh={refreshReservationsAndStats}
          onViewOnMap={(r) => {
            selectedLotId = r.lotId;
            tab = 'map';
            map?.setView([r.lat, r.lon], Math.max(map?.getZoom?.() ?? 13, 15), { animate: true });
          }}
          onReschedule={openReschedule}
          onStartSession={startSession}
          onStopSession={stopSession}
          onCancel={cancelBooking}
          onGoHome={() => (tab = 'home')}
          onGoMap={() => (tab = 'map')}
        />
      {/if}

      {#if tab === 'profile'}
        <ProfileTab
          email={page.data.user?.email}
          {stats}
          {bookingVehicle}
          {bookingNeedsCharging}
          onVehicleChange={(v) => (bookingVehicle = v)}
          onChargingToggle={() => (bookingNeedsCharging = !bookingNeedsCharging)}
        />
      {/if}

      <!-- Reschedule modal -->
      {#if rescheduleOpen && rescheduleTarget}
        <div class="reschedule-backdrop" onclick={() => !rescheduleBusy && (rescheduleOpen = false)} aria-hidden="true"></div>
        <div class="reschedule-modal" role="dialog" aria-modal="true" aria-label="Reschedule booking">
          <div class="reschedule-header">
            <h2 class="reschedule-title">Reschedule</h2>
            <button class="sp-btn" type="button" onclick={() => (rescheduleOpen = false)} disabled={rescheduleBusy}>✕</button>
          </div>
          <div class="reschedule-body">
            <label class="reschedule-label">
              New start time
              <input type="datetime-local" class="sp-input mt-1" bind:value={rescheduleStart} disabled={rescheduleBusy} />
            </label>
            <label class="reschedule-label">
              Duration (hours)
              <input type="number" class="sp-input mt-1" min="1" max="24" bind:value={rescheduleDuration} disabled={rescheduleBusy} />
            </label>
          </div>
          <div class="reschedule-footer">
            <button class="sp-btn" type="button" onclick={() => (rescheduleOpen = false)} disabled={rescheduleBusy}>Cancel</button>
            <button class="sp-btn sp-btn-primary" type="button" onclick={submitReschedule} disabled={rescheduleBusy}>
              {rescheduleBusy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      {/if}

      {#if celebration}
        {#key burstKey}
          <BookingConfirmedOverlay receipt={celebration.receiptCode} />
        {/key}
      {/if}

      <ParkingRush
        open={parkingRushOpen}
        onClose={() => (parkingRushOpen = false)}
        onWin={({ score, timeMs }) => {
          showToast('Nice!', `Parking Rush complete • score ${score} • ${Math.round(timeMs / 100) / 10}s`);
        }}
      />
    </div>
  </div>

  <DashBottomNav {tab} onTabChange={(t) => (tab = t)} />
</div>

<!-- Toast -->
{#if toast}
  <div class="sp-toast" role="status" aria-live="polite">
    <div class="sp-toast-title">{toast.title}</div>
    {#if toast.message}<div class="sp-toast-msg">{toast.message}</div>{/if}
  </div>
{/if}

<!-- Undo -->
{#if undo}
  <div class="sp-undo" role="status">
    <span>{undo.title}{undo.message ? ` — ${undo.message}` : ''}</span>
    <button class="sp-btn sp-btn-primary sp-undo-btn" type="button" onclick={async () => { await undo!.undo(); undo = null; }}>Undo</button>
  </div>
{/if}

<!-- Booking modal -->
{#if bookingOpen}
  <BookingModal
    lot={selectedLotData}
    duration={bookingDuration}
    vehicle={bookingVehicle}
    needsCharging={bookingNeedsCharging}
    slot={bookingSlot}
    priceId={selectedPriceId}
    busy={bookingBusy}
    error={bookingError}
    onClose={closeBookingModal}
    onDurationChange={(h) => (bookingDuration = h)}
    onVehicleChange={(v) => (bookingVehicle = v)}
    onChargingToggle={() => (bookingNeedsCharging = !bookingNeedsCharging)}
    onSlotChange={(s) => (bookingSlot = s)}
    onPriceChange={(p) => (selectedPriceId = p)}
    onConfirm={confirmBooking}
    onStartTimeChange={(ts) => (bookingStartTime = ts)}
    bindModalEl={(el) => (bookingModalEl = el)}
  />
{/if}

<style>
.dash-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100svh;
}
.dash-main {
  grid-column: 2;
  min-height: 100svh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.dash-content {
  flex: 1;
  padding: 24px;
  padding-bottom: 32px;
  overflow-y: auto;
}
@media (max-width: 1023px) {
  .dash-shell { grid-template-columns: 1fr; }
  .dash-main { grid-column: 1; }
  .dash-content {
    padding: 12px;
    padding-bottom: calc(64px + env(safe-area-inset-bottom) + 12px);
  }
  /* Map tab gets zero padding so the map fills edge-to-edge */
  .dash-content.is-map-tab {
    padding: 0;
    padding-bottom: 0;
    overflow: hidden;
  }
}

/* Toast */
.sp-toast {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  padding: 12px 20px;
  border-radius: 14px;
  border: 1px solid var(--sp-border);
  background: var(--sp-surface-strong);
  box-shadow: 0 18px 60px rgba(0,0,0,0.35);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  min-width: 200px;
  max-width: calc(100vw - 32px);
  text-align: center;
}
.sp-toast-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--sp-text);
}
.sp-toast-msg {
  font-size: 12px;
  color: var(--sp-muted);
  margin-top: 2px;
}

/* Undo bar */
.sp-undo {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
  right: 16px;
  z-index: 90;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 14px;
  border: 1px solid var(--sp-border);
  background: var(--sp-surface-strong);
  box-shadow: 0 12px 40px rgba(0,0,0,0.3);
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-text);
}
.sp-undo-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

/* Reschedule modal */
.reschedule-backdrop {
  position: fixed;
  inset: 0;
  z-index: 49;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.reschedule-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 50;
  width: min(480px, calc(100vw - 32px));
  border-radius: 20px;
  border: 1px solid var(--sp-border);
  background: var(--sp-surface-strong);
  box-shadow: 0 28px 100px rgba(0,0,0,0.4);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.reschedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.reschedule-title {
  font-family: var(--sp-font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--sp-text);
  margin: 0;
}
.reschedule-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.reschedule-label {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  font-weight: 600;
  color: var(--sp-muted);
}
.reschedule-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
