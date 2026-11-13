import React, { useEffect, useRef, useState } from 'react';
import exifr from 'exifr';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Droplets,
  FileWarning,
  Lightbulb,
  Loader2,
  Lock,
  LocateFixed,
  MapPin,
  Pencil,
  Route,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trees,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react';
import samplePipeBurst from '../assets/images/evidence_pipe_burst_1794565148729.jpg';
import sampleSinkhole from '../assets/images/evidence_synthetic_sinkhole_1794565149966.jpg';
import { SERVICE_CATEGORIES } from '../data/civicSeedData';
import type {
  CivicReport,
  ExifMetadataPayload,
  ForensicAnalysisResult,
  ServiceCategoryId,
  SeverityLevel,
  WardRecord,
} from '../types/civic';
import { getDepotForCategory, haversineDistanceMeters } from '../utils/wardResolver';
import { BASEMAP_ORDER, BASEMAPS, type BasemapId } from '../utils/mapTiles';
import { InteractiveMap } from './InteractiveMap';

interface ReportFormModalProps {
  isOpen: boolean;
  initialCategoryId: ServiceCategoryId;
  activeWard: WardRecord;
  darkMode: boolean;
  emergencyMode: boolean;
  existingReports: CivicReport[];
  onClose: () => void;
  onSubmitNewReport: (report: CivicReport, rewardPoints: number) => void;
  onCorroborateExisting: (reportId: string) => void;
}

const SAMPLE_TEST_MEDIA = [
  {
    id: 'sample-real-water',
    label: 'Real Photo: Pipe Burst',
    url: samplePipeBurst,
    simulatedExif: {
      timestampIso: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      ageMinutes: 18,
      latitude: -26.014,
      longitude: 28.0054,
      deviceMakeModel: 'Samsung Galaxy S25 Ultra',
      stripped: false,
    },
  },
  {
    id: 'sample-synthetic',
    label: 'Test Synthetic AI Image',
    url: sampleSinkhole,
    simulatedExif: {
      timestampIso: null,
      ageMinutes: null,
      latitude: null,
      longitude: null,
      deviceMakeModel: null,
      stripped: true,
    },
  },
];

const QUICK_FAULT_PRESETS: Record<
  ServiceCategoryId,
  Array<{ label: string; title: string; detail: string; severity: SeverityLevel }>
> = {
  water: [
    {
      label: 'Burst main pipe',
      title: 'Burst underground water main flooding roadway',
      detail: 'Pressurised potable water gushing onto asphalt with pavement undermining risk.',
      severity: 'CRITICAL',
    },
    {
      label: 'No water pressure',
      title: 'Zero water supply / dry taps across street block',
      detail: 'Complete loss of water pressure affecting multiple residential properties.',
      severity: 'HIGH',
    },
    {
      label: 'Sewer overflow',
      title: 'Blocked municipal sewer manhole overflowing',
      detail: 'Raw sewage surcharging from street manhole cover creating a health hazard.',
      severity: 'CRITICAL',
    },
    {
      label: 'Leaking hydrant / meter',
      title: 'Continuous leak at boundary water meter / hydrant',
      detail: 'Steady clean water leak wasting supply at pavement box.',
      severity: 'MODERATE',
    },
  ],
  electricity: [
    {
      label: 'Area power outage',
      title: 'Unplanned electricity outage across ward feeder',
      detail: 'No supply outside load-shedding schedule; neighbours on same phase also dark.',
      severity: 'HIGH',
    },
    {
      label: 'Tripped mini-sub',
      title: 'Mini-substation tripped with loud arcing sound',
      detail: 'Substation enclosure humming/tripping; suspected feeder breaker fault.',
      severity: 'CRITICAL',
    },
    {
      label: 'Downed / exposed cable',
      title: 'Exposed or fallen electrical conductor on verge',
      detail: 'Live hazard near pedestrian walkway requiring urgent City Power / Eskom isolation.',
      severity: 'CRITICAL',
    },
    {
      label: 'Voltage dipping',
      title: 'Repeated severe brownouts and voltage spikes',
      detail: 'Fluctuating phase voltage risking household appliances.',
      severity: 'MODERATE',
    },
  ],
  roads: [
    {
      label: 'Deep pothole',
      title: 'Deep multi-lane pothole damaging tyres',
      detail: 'Sharp-edged tar cavity in main travel lane forcing vehicles to swerve.',
      severity: 'HIGH',
    },
    {
      label: 'Blocked stormwater drain',
      title: 'Silted catch-pit causing intersection flooding',
      detail: 'Stormwater grid clogged with debris; water pooling across carriageway.',
      severity: 'MODERATE',
    },
    {
      label: 'Road sinkhole',
      title: 'Subsidence / sinkhole opening beneath asphalt',
      detail: 'Hollow pavement collapse requiring immediate barricading and JRA inspection.',
      severity: 'CRITICAL',
    },
    {
      label: 'Missing manhole cover',
      title: 'Open uncovered stormwater manhole on street',
      detail: 'Heavy cast-iron lid missing, exposing deep shaft.',
      severity: 'HIGH',
    },
  ],
  streetlights: [
    {
      label: 'Traffic lights out',
      title: '4-way intersection traffic signals completely dead',
      detail: 'All robot heads dark during peak commuter flow; urgent UPS/controller check needed.',
      severity: 'CRITICAL',
    },
    {
      label: 'Traffic lights flashing',
      title: 'Intersection signals stuck on flashing amber/red',
      detail: 'Controller fault causing heavy congestion at major crossing.',
      severity: 'HIGH',
    },
    {
      label: 'Streetlamp out',
      title: 'Row of streetlamps dark along residential road',
      detail: 'Several consecutive poles unlit at night reducing visibility and safety.',
      severity: 'MODERATE',
    },
    {
      label: 'Day-burner lamp',
      title: 'Streetlights burning continuously during daylight',
      detail: 'Faulty photocell relay keeping pole lights energized 24/7.',
      severity: 'LOW',
    },
  ],
  waste: [
    {
      label: 'Missed bin collection',
      title: 'Scheduled weekly refuse round missed on street',
      detail: 'Wheelie bins left on kerbside uncollected past scheduled round.',
      severity: 'MODERATE',
    },
    {
      label: 'Illegal dumping',
      title: 'Builder rubble & waste illegally dumped on verge',
      detail: 'Large pile of dumped refuse obstructing pavement and stormwater flow.',
      severity: 'HIGH',
    },
    {
      label: 'Overflowing public skip',
      title: 'Public litter bins / skip overflowing',
      detail: 'Windblown refuse scattering across nearby corner.',
      severity: 'MODERATE',
    },
  ],
  parks: [
    {
      label: 'Fallen tree blocking road',
      title: 'Uprooted street tree blocking traffic lane',
      detail: 'Large canopy branch across roadway following wind/rain.',
      severity: 'CRITICAL',
    },
    {
      label: 'Overgrown verge / park',
      title: 'Tall grass obstructing intersection sightline',
      detail: 'Overgrown municipal servitude obscuring oncoming traffic.',
      severity: 'MODERATE',
    },
    {
      label: 'Broken park infrastructure',
      title: 'Damaged perimeter fence or playground equipment',
      detail: 'Safety hazard inside public park requiring City Parks maintenance.',
      severity: 'LOW',
    },
  ],
  safety: [
    {
      label: 'Bylaw contravention',
      title: 'Unauthorised obstruction / municipal bylaw breach',
      detail: 'Requesting JMPD / Metro Police inspection for public safety compliance.',
      severity: 'MODERATE',
    },
    {
      label: 'Traffic hazard / pointsmen',
      title: 'Severe traffic gridlock needing Metro Police',
      detail: 'Intersection gridlock requiring immediate pointsmen deployment.',
      severity: 'HIGH',
    },
    {
      label: 'Abandoned vehicle',
      title: 'Stripped / abandoned vehicle left on public road',
      detail: 'Unlicensed wreck obstructing kerbside lane for over 72 hours.',
      severity: 'LOW',
    },
  ],
  accounts: [],
  anticorruption: [],
  notices: [],
};

const SERVICE_ICONS: Record<ServiceCategoryId, React.ComponentType<{ className?: string }>> = {
  water: Droplets,
  electricity: Zap,
  roads: Route,
  streetlights: Lightbulb,
  waste: Trash2,
  parks: Trees,
  safety: Shield,
  accounts: CreditCard,
  anticorruption: Lock,
  notices: ClipboardList,
};

const STEPS = [
  { num: 1, label: 'Evidence' },
  { num: 2, label: 'Service' },
  { num: 3, label: 'Fault' },
  { num: 4, label: 'Location' },
  { num: 5, label: 'Summary' },
] as const;

export const ReportFormModal: React.FC<ReportFormModalProps> = ({
  isOpen,
  initialCategoryId,
  activeWard,
  darkMode,
  emergencyMode,
  existingReports,
  onClose,
  onSubmitNewReport,
  onCorroborateExisting,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [categoryId, setCategoryId] = useState<ServiceCategoryId>(initialCategoryId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState(`${activeWard.corridors[0] || 'Main Road'}, ${activeWard.suburbs[0]}`);
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>({
    lat: activeWard.lat,
    lng: activeWard.lng,
  });
  const [municipalRef, setMunicipalRef] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>(emergencyMode ? 'CRITICAL' : 'MODERATE');
  const [isEmergency, setIsEmergency] = useState(emergencyMode);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [pickerBasemap, setPickerBasemap] = useState<BasemapId | undefined>(undefined);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exifData, setExifData] = useState<ExifMetadataPayload | null>(null);
  const [forensics, setForensics] = useState<ForensicAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const swipeRef = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const safeInitial = SERVICE_CATEGORIES.find((c) => c.id === initialCategoryId && !c.isInfoModule)
        ? initialCategoryId
        : 'water';
      setStep(1);
      setCategoryId(safeInitial);
      setTitle('');
      setDescription('');
      setMunicipalRef('');
      setPreviewUrl(null);
      setExifData(null);
      setForensics(null);
      setAnalysisError(null);
      setAddress(`${activeWard.corridors[0] || 'Main Road'}, ${activeWard.suburbs[0]}`);
      setPinCoords({ lat: activeWard.lat, lng: activeWard.lng });
      setIsEmergency(emergencyMode);
      setSeverity(emergencyMode ? 'CRITICAL' : 'MODERATE');
    }
    return () => {
      if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
    };
  }, [isOpen, initialCategoryId, activeWard, emergencyMode]);

  if (!isOpen) return null;

  const pinLat = pinCoords.lat;
  const pinLng = pinCoords.lng;

  const currentCategory = SERVICE_CATEGORIES.find((c) => c.id === categoryId) ?? SERVICE_CATEGORIES[0];
  const assignedDepot = getDepotForCategory(activeWard, categoryId);

  const nearbyDuplicate = existingReports.find(
    (r) =>
      r.wardId === activeWard.id &&
      r.categoryId === categoryId &&
      r.status !== 'Resolved' &&
      r.status !== 'Blocked by AI Forensics'
  );

  const isBlockedSynthetic =
    forensics?.authenticityStatus === 'FLAGGED_SYNTHETIC' || forensics?.isAiGenerated;

  const mapDepartmentToCategory = (dept: string): ServiceCategoryId => {
    const d = dept.toLowerCase();
    if (d.includes('water')) return 'water';
    if (d.includes('electric') || d.includes('power')) return 'electricity';
    if (d.includes('road')) return 'roads';
    if (d.includes('street') || d.includes('signal')) return 'streetlights';
    if (d.includes('waste') || d.includes('refuse')) return 'waste';
    if (d.includes('park') || d.includes('tree')) return 'parks';
    if (d.includes('safe') || d.includes('police')) return 'safety';
    return categoryId;
  };

  const scheduleStepAdvance = (nextStep: 1 | 2 | 3 | 4 | 5, delayMs = 240) => {
    if (autoTimerRef.current) window.clearTimeout(autoTimerRef.current);
    autoTimerRef.current = window.setTimeout(() => {
      setStep(nextStep);
    }, delayMs);
  };

  const runGeminiForensics = async (
    base64: string,
    mimeType: string,
    extractedExif: ExifMetadataPayload
  ) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const response = await fetch('/api/forensics/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          exifMetadata: extractedExif,
          reportedAddress: `${address} (${pinLat}, ${pinLng})`,
          wardContext: `${activeWard.municipalityName} Ward ${activeWard.wardNumber} (${activeWard.suburbs.join(', ')})`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gemini Vision forensic check failed.');
      }

      const result = data as ForensicAnalysisResult;
      setForensics(result);

      if (result.triage) {
        if (result.triage.department) {
          setCategoryId(mapDepartmentToCategory(result.triage.department));
        }
        if (result.triage.faultTitle) {
          setTitle(result.triage.faultTitle);
        }
        if (result.triage.engineeringSummary) {
          setDescription(result.triage.engineeringSummary);
        }
        if (result.triage.severity) {
          setSeverity(result.triage.severity);
        }
        if (result.triage.immediateDanger) {
          setIsEmergency(true);
        }
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Unable to complete AI forensic analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    setForensics(null);
    setAnalysisError(null);

    const isVideo = file.type.startsWith('video/');
    if (isVideo) {
      const videoUrl = URL.createObjectURL(file);
      setPreviewUrl(videoUrl);
      setExifData({
        timestampIso: new Date(file.lastModified).toISOString(),
        ageMinutes: Math.max(0, Math.round((Date.now() - file.lastModified) / 60000)),
        latitude: pinLat,
        longitude: pinLng,
        distanceFromPinMeters: 14,
        deviceMakeModel: 'Mobile Video Capture',
        fileName: file.name,
        fileSizeKb: Math.round(file.size / 1024),
        stripped: false,
      });
      setAnalysisError('Video queued. Capture a still photo for Gemini Vision forensics or continue.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      const base64 = dataUrl.split(',')[1];

      let parsedExif: Record<string, unknown> | null = null;
      try {
        parsedExif = (await exifr.parse(file, { gps: true, tiff: true, exif: true })) ?? null;
      } catch {
        parsedExif = null;
      }

      const rawDate = parsedExif?.DateTimeOriginal ?? parsedExif?.CreateDate;
      const timestampIso = rawDate instanceof Date ? rawDate.toISOString() : null;
      const ageMinutes = timestampIso
        ? Math.max(0, Math.round((Date.now() - new Date(timestampIso).getTime()) / 60000))
        : null;

      const lat = typeof parsedExif?.latitude === 'number' ? parsedExif.latitude : null;
      const lng = typeof parsedExif?.longitude === 'number' ? parsedExif.longitude : null;
      const distanceFromPinMeters =
        lat !== null && lng !== null ? haversineDistanceMeters(lat, lng, pinLat, pinLng) : null;

      const make = typeof parsedExif?.Make === 'string' ? parsedExif.Make : '';
      const model = typeof parsedExif?.Model === 'string' ? parsedExif.Model : '';
      const deviceMakeModel = [make, model].filter(Boolean).join(' ').trim() || null;

      const payload: ExifMetadataPayload = {
        timestampIso,
        ageMinutes,
        latitude: lat,
        longitude: lng,
        distanceFromPinMeters,
        deviceMakeModel,
        fileName: file.name,
        fileSizeKb: Math.round(file.size / 1024),
        stripped: !timestampIso && lat === null && !deviceMakeModel,
      };

      setExifData(payload);
      await runGeminiForensics(base64, file.type || 'image/jpeg', payload);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSample = async (sample: (typeof SAMPLE_TEST_MEDIA)[number]) => {
    setForensics(null);
    setAnalysisError(null);
    setPreviewUrl(sample.url);
    setTitle('');
    setDescription('');

    try {
      const res = await fetch(sample.url);
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const dist =
        sample.simulatedExif.latitude !== null && sample.simulatedExif.longitude !== null
          ? haversineDistanceMeters(
              sample.simulatedExif.latitude,
              sample.simulatedExif.longitude,
              pinLat,
              pinLng
            )
          : null;

      const payload: ExifMetadataPayload = {
        timestampIso: sample.simulatedExif.timestampIso,
        ageMinutes: sample.simulatedExif.ageMinutes,
        latitude: sample.simulatedExif.latitude,
        longitude: sample.simulatedExif.longitude,
        distanceFromPinMeters: dist,
        deviceMakeModel: sample.simulatedExif.deviceMakeModel,
        fileName: `${sample.id}.jpg`,
        fileSizeKb: Math.round(blob.size / 1024),
        stripped: sample.simulatedExif.stripped,
      };
      setExifData(payload);
      await runGeminiForensics(base64, blob.type || 'image/jpeg', payload);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Failed to load sample image.');
    }
  };

  const handleUseCurrentGps = () => {
    setIsLocatingGps(true);
    const apply = (lat: number, lng: number) => {
      setPinCoords({ lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) });
      setIsLocatingGps(false);
    };
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => apply(pos.coords.latitude, pos.coords.longitude),
        () => apply(activeWard.lat, activeWard.lng),
        { timeout: 3500 }
      );
    } else {
      apply(activeWard.lat, activeWard.lng);
    }
  };

  const handleSubmitFinal = () => {
    if (isBlockedSynthetic) return;

    const rewardPoints = forensics?.authenticityStatus === 'VERIFIED' ? 50 : previewUrl ? 25 : 15;
    const newId = `CP-2026-${Math.floor(1050 + Math.random() * 8900)}`;

    const report: CivicReport = {
      id: newId,
      wardId: activeWard.id,
      municipalityCode: activeWard.municipalityCode,
      wardNumber: activeWard.wardNumber,
      suburb: activeWard.suburbs[0],
      categoryId,
      departmentLabel: currentCategory.title,
      title: title.trim() || `${currentCategory.shortTitle} fault at ${address}`,
      description:
        description.trim() ||
        `Reported via CivicPulse AI mobile wizard for ${assignedDepot}.`,
      address: address.trim() || `${activeWard.corridors[0] || 'Main Rd'}, ${activeWard.suburbs[0]}`,
      lat: pinLat,
      lng: pinLng,
      municipalRef: isEmergency ? municipalRef.trim() || 'SOS-BYPASS' : municipalRef.trim() || null,
      status: isEmergency ? 'Escalated to Depot' : 'Logged',
      severity,
      isEmergency,
      clusteredHouseholds: 1,
      createdAtIso: new Date().toISOString(),
      timeAgoLabel: 'Just now',
      slaDeadlineHours: currentCategory.slaHours || 24,
      slaElapsedHours: 0,
      assignedDepot,
      reporterName: 'You (Ward Resident)',
      photoUrl: previewUrl ?? undefined,
      forensics: {
        status: forensics?.authenticityStatus ?? 'WARNING_STRIPPED_METADATA',
        summaryLabel:
          forensics?.authenticityStatus === 'VERIFIED'
            ? 'Verified Live Capture (GPS + Timestamp Match)'
            : previewUrl
              ? 'Metadata Stripped / Edited (Requires Manual Review)'
              : 'Text-Only Submission (No Media Attached)',
        timestampLabel: exifData?.timestampIso
          ? `EXIF Timestamp: ${exifData.ageMinutes ?? 0} mins ago`
          : 'EXIF Timestamp: Missing',
        gpsMatchLabel:
          exifData?.distanceFromPinMeters !== null && exifData?.distanceFromPinMeters !== undefined
            ? `GPS Match: ${exifData.distanceFromPinMeters}m from pin`
            : 'GPS Match: Pin confirmed manually',
        deviceLabel: exifData?.deviceMakeModel ?? forensics?.metadataCheck?.deviceDetected ?? 'Manual Entry',
        aiSyntheticScorePct: forensics ? Math.round((1 - forensics.confidenceScore) * 100) / 10 : 0,
        notes: forensics?.forensicNotes ?? 'Submitted directly through guided mobile wizard.',
      },
      escalationLog: [
        `Logged to ${activeWard.municipalityCode} Ward ${activeWard.wardNumber} Live Feed`,
        `Routed to ${activeWard.councillor.name} & ${assignedDepot}`,
      ],
      verifiedByResidents: 1,
    };

    onSubmitNewReport(report, rewardPoints);
    onClose();
  };

  const presets = QUICK_FAULT_PRESETS[categoryId] ?? [];
  const rewardPreview = forensics?.authenticityStatus === 'VERIFIED' ? 50 : previewUrl ? 25 : 15;

  const canGoNext =
    step === 1 ? !isAnalyzing && !isBlockedSynthetic : step < 5;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        onTouchStart={(e) => {
          const t = e.target as HTMLElement;
          swipeRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            ignore: Boolean(t.closest('.leaflet-container') || t.closest('input, textarea')),
          };
        }}
        onTouchEnd={(e) => {
          if (!swipeRef.current || swipeRef.current.ignore) {
            swipeRef.current = null;
            return;
          }
          const dx = e.changedTouches[0].clientX - swipeRef.current.x;
          const dy = e.changedTouches[0].clientY - swipeRef.current.y;
          swipeRef.current = null;
          if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            e.stopPropagation();
            if (dx > 0 && step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5);
            else if (dx < 0 && canGoNext && step < 5) setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5);
          }
        }}
        className="w-full max-w-xl h-[90dvh] sm:h-[630px] max-h-[92dvh] flex flex-col bg-white dark:bg-[#0A0E17] border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden"
      >
        {/* Pinned Header + 5-Step Progress */}
        <div className="shrink-0 px-4 pt-3.5 pb-3 border-b border-slate-200 dark:border-white/12 space-y-2.5 bg-white dark:bg-[#0A0E17]">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-[10px] text-sky-600 dark:text-sky-400 uppercase tracking-wider truncate">
                Step 0{step} / 05 · Ward {activeWard.wardNumber} ({activeWard.suburbs[0]})
              </div>
              <h2 id="report-modal-title" className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                {step === 1 && 'Snap or verify fault photo'}
                {step === 2 && 'Which municipal service?'}
                {step === 3 && "What's the fault?"}
                {step === 4 && 'Where is it located?'}
                {step === 5 && 'Review & escalate'}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close report wizard"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tappable Step Progress Track */}
          <div className="grid grid-cols-5 gap-1">
            {STEPS.map((s) => {
              const active = s.num === step;
              const done = s.num < step;
              const locked = s.num > 1 && Boolean(isBlockedSynthetic);
              return (
                <button
                  key={s.num}
                  type="button"
                  disabled={locked}
                  onClick={() => setStep(s.num)}
                  className="text-left space-y-1 cursor-pointer disabled:opacity-40"
                >
                  <div
                    className={`h-1.5 w-full transition-colors ${
                      active
                        ? 'bg-sky-500 dark:bg-sky-400'
                        : done
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : 'bg-slate-200 dark:bg-white/15'
                    }`}
                  />
                  <div
                    className={`font-mono text-[9px] truncate ${
                      active
                        ? 'text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {s.num}. {s.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Single-Screen Guided Body (Zero Endless Scroll) */}
        <div className="flex-1 p-4 flex flex-col justify-between gap-3 overflow-hidden">
          {isEmergency && step !== 5 && (
            <div className="shrink-0 px-3 py-2 bg-red-600/10 border border-red-500/40 flex items-center justify-between gap-2 text-[11px] text-red-700 dark:text-red-300">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate font-medium">Emergency SOS: Ref # bypassed</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEmergency(false)}
                className="underline font-semibold shrink-0 cursor-pointer"
              >
                Off
              </button>
            </div>
          )}

          {/* STEP 1: EVIDENCE & AI FORENSICS */}
          {step === 1 && (
            <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFileSelected(f);
                }}
              />

              {previewUrl ? (
                <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0">
                  <div className="relative flex-1 min-h-[140px] max-h-[240px] bg-slate-900 border border-slate-200 dark:border-white/15 overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Uploaded civic fault evidence"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-2.5 py-1.5 bg-black/75 text-white text-[11px] font-semibold border border-white/25 cursor-pointer"
                    >
                      Replace Photo
                    </button>
                  </div>

                  {isAnalyzing ? (
                    <div className="p-3 border border-sky-500/40 bg-sky-500/10 flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-100">
                      <Loader2 className="w-4 h-4 animate-spin text-sky-500 shrink-0" />
                      <span>Extracting EXIF GPS & running Gemini 2.5 Vision triage...</span>
                    </div>
                  ) : forensics ? (
                    <div
                      className={`p-3 border text-xs space-y-1 ${
                        forensics.authenticityStatus === 'VERIFIED'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                          : forensics.authenticityStatus === 'FLAGGED_SYNTHETIC'
                            ? 'bg-red-50 dark:bg-red-950/50 border-red-400 dark:border-red-700 text-red-900 dark:text-red-200'
                            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          {forensics.authenticityStatus === 'VERIFIED' && <ShieldCheck className="w-4 h-4" />}
                          {forensics.authenticityStatus === 'WARNING_STRIPPED_METADATA' && (
                            <FileWarning className="w-4 h-4" />
                          )}
                          {forensics.authenticityStatus === 'FLAGGED_SYNTHETIC' && (
                            <ShieldAlert className="w-4 h-4" />
                          )}
                          <span>
                            {forensics.authenticityStatus === 'VERIFIED'
                              ? 'Verified Live Capture (+50 CR)'
                              : forensics.authenticityStatus === 'FLAGGED_SYNTHETIC'
                                ? 'Synthetic Media Blocked'
                                : 'Metadata Stripped (Manual Review)'}
                          </span>
                        </span>
                        <span className="font-mono text-[11px]">
                          {Math.round(forensics.confidenceScore * 100)}%
                        </span>
                      </div>
                      <p className="text-[11px] line-clamp-2">{forensics.forensicNotes}</p>
                      {forensics.triage?.faultTitle && !isBlockedSynthetic && (
                        <div className="pt-1 font-mono text-[10px] opacity-90 truncate">
                          AI Pre-filled: {forensics.triage.department} · {forensics.triage.faultTitle}
                        </div>
                      )}
                    </div>
                  ) : analysisError ? (
                    <div className="p-2.5 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
                      {analysisError}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) void handleFileSelected(dropped);
                  }}
                  className="flex-1 border-2 border-dashed border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/[0.03] p-4 flex flex-col items-center justify-center text-center gap-3"
                >
                  <div className="w-12 h-12 bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      Upload photo for instant AI auto-fill
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Gemini Vision detects the department, writes the fault report & earns +50 Civic Credits.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[44px] px-5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Take Photo / Upload</span>
                  </button>
                </div>
              )}

              {/* Quick Test Samples + Skip to Survey */}
              <div className="shrink-0 space-y-2">
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-sky-500" /> Quick Test:
                  </span>
                  {SAMPLE_TEST_MEDIA.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => void handleLoadSample(sample)}
                      className="px-2.5 py-1 border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 hover:border-sky-500 text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TAP-TO-SELECT MUNICIPAL SERVICE (AUTO-ADVANCES) */}
          {step === 2 && (
            <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0">
              {nearbyDuplicate && (
                <div className="shrink-0 p-2.5 border border-amber-400/50 bg-amber-500/10 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {nearbyDuplicate.clusteredHouseholds} Neighbours already logged {currentCategory.shortTitle}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-200/80 truncate">
                      {nearbyDuplicate.title} · {nearbyDuplicate.address}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onCorroborateExisting(nearbyDuplicate.id);
                      onClose();
                    }}
                    className="shrink-0 px-2.5 py-1.5 bg-amber-600 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    +1 Me Too
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 flex-1 content-start">
                {SERVICE_CATEGORIES.filter((c) => !c.isInfoModule).map((cat) => {
                  const selected = cat.id === categoryId;
                  const Icon = SERVICE_ICONS[cat.id];
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(cat.id);
                        scheduleStepAdvance(3, 200);
                      }}
                      className={`p-3 border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        selected
                          ? 'border-sky-500 bg-sky-500/15 dark:border-sky-400 dark:bg-sky-400/15'
                          : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] hover:border-slate-400 dark:hover:border-white/40'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 shrink-0 flex items-center justify-center border ${
                          selected
                            ? 'border-sky-500 bg-sky-500 text-white'
                            : 'border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {cat.shortTitle}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {cat.entity} · {cat.slaHours}h SLA
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="shrink-0 text-[11px] font-mono text-slate-500 dark:text-slate-400 text-center">
                Tap any service to select & advance automatically
              </div>
            </div>
          )}

          {/* STEP 3: SURVEY QUESTION "WHAT'S THE FAULT?" */}
          {step === 3 && (
            <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0">
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  1-Tap Common {currentCategory.shortTitle} Faults (auto-fills below):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => {
                    const active = title === preset.title;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setTitle(preset.title);
                          setDescription(preset.detail);
                          setSeverity(preset.severity);
                        }}
                        className={`px-2.5 py-1.5 border text-xs font-medium cursor-pointer transition-colors ${
                          active
                            ? 'border-sky-500 bg-sky-500 text-white'
                            : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-slate-200 hover:border-sky-500'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Fault Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`What happened? e.g. ${currentCategory.shortTitle} outage on ${activeWard.corridors[0] || 'Main Rd'}`}
                    className="w-full min-h-[42px] px-3 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Brief Details (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Landmarks, hazard warning, or house numbers affected..."
                    className="w-full p-2.5 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 shrink-0">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    How urgent is it? (Tap to advance)
                  </span>
                  <span className="font-mono text-slate-400">{severity}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'LOW', label: 'Low', hint: 'Routine' },
                      { id: 'MODERATE', label: 'Medium', hint: 'Disrupted' },
                      { id: 'HIGH', label: 'High', hint: 'Street' },
                      { id: 'CRITICAL', label: 'Critical', hint: 'Danger' },
                    ] as const
                  ).map((lvl) => {
                    const active = severity === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setSeverity(lvl.id);
                          if (lvl.id === 'CRITICAL') setIsEmergency(true);
                          scheduleStepAdvance(4, 220);
                        }}
                        className={`py-2 px-1.5 border text-center cursor-pointer transition-colors ${
                          active
                            ? lvl.id === 'CRITICAL'
                              ? 'border-red-500 bg-red-600 text-white'
                              : 'border-sky-500 bg-sky-500 text-white'
                            : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{lvl.label}</div>
                        <div className="text-[9px] opacity-80">{lvl.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: WHERE IS IT? (ACTIVE LEAFLET MAP + CORRIDOR CHIPS) */}
          {step === 4 && (
            <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0">
              <div className="relative flex-1 min-h-[155px] border border-slate-200 dark:border-white/15 overflow-hidden">
                <InteractiveMap
                  centerLat={pinLat}
                  centerLng={pinLng}
                  zoom={14}
                  darkMode={darkMode}
                  basemap={pickerBasemap}
                  mode="picker"
                  className="w-full h-full"
                  pickedLat={pinLat}
                  pickedLng={pinLng}
                  onPickLocation={(lat, lng) => setPinCoords({ lat, lng })}
                />
                <button
                  type="button"
                  onClick={handleUseCurrentGps}
                  disabled={isLocatingGps}
                  className="absolute top-2 right-2 z-[400] px-2.5 py-1.5 bg-slate-900/90 text-white text-[11px] font-semibold border border-white/25 flex items-center gap-1 cursor-pointer"
                >
                  <LocateFixed className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isLocatingGps ? 'Locating...' : 'My GPS'}</span>
                </button>
                <div className="absolute top-2 left-2 z-[400] flex items-center gap-0.5 p-0.5 bg-slate-900/90 border border-white/25">
                  {BASEMAP_ORDER.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPickerBasemap(id)}
                      title={BASEMAPS[id].label}
                      className={`px-1.5 py-1 text-[10px] font-mono font-semibold cursor-pointer ${
                        (pickerBasemap ?? (darkMode ? "dark" : "streets")) === id
                          ? "bg-white text-slate-900"
                          : "text-white/80"
                      }`}
                    >
                      {BASEMAPS[id].shortLabel}
                    </button>
                  ))}
                </div>
                <div className="absolute bottom-2 left-2 z-[400] px-2 py-1 bg-black/75 text-white font-mono text-[10px]">
                  {pinLat.toFixed(4)}, {pinLng.toFixed(4)} · Tap map to move pin
                </div>
              </div>

              {/* 1-Tap Ward Corridor Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] font-mono text-slate-400 shrink-0">Corridors:</span>
                {activeWard.corridors.map((street) => (
                  <button
                    key={street}
                    type="button"
                    onClick={() => setAddress(`${street}, ${activeWard.suburbs[0]}`)}
                    className="px-2 py-1 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:border-sky-500 text-[11px] text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {street}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-0.5">
                    Street / Corner
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full min-h-[38px] px-2.5 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-0.5">
                    Municipal Ref # {isEmergency ? '(Bypassed SOS)' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    value={municipalRef}
                    onChange={(e) => setMunicipalRef(e.target.value)}
                    placeholder={`e.g. ${currentCategory.refHint}`}
                    className="w-full min-h-[38px] px-2.5 border border-slate-200 dark:border-white/15 bg-white dark:bg-[#05070B] text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: ONE-SCREEN MOBILE SUMMARY (TAP ANY SECTION TO EDIT) */}
          {step === 5 && (
            <div className="flex-1 flex flex-col justify-between gap-2 min-h-0">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Tap any section below to edit before escalating</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  +{rewardPreview} Civic Credits
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 flex-1 content-start">
                {/* Summary Row 1: Evidence */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="p-2.5 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] hover:border-sky-500 text-left flex items-center justify-between gap-2.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Evidence thumb"
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-cover border border-slate-300 dark:border-white/20 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 shrink-0">
                        <Camera className="w-4 h-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-slate-400">01 · EVIDENCE & FORENSICS</div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {forensics?.authenticityStatus === 'VERIFIED'
                          ? 'Verified Live Capture (EXIF + GPS Match)'
                          : previewUrl
                            ? 'Photo Attached · Metadata Check'
                            : 'Text-only report (Tap to add photo for +50 CR)'}
                      </div>
                    </div>
                  </div>
                  <Pencil className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                </button>

                {/* Summary Row 2: Service & Depot */}
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="p-2.5 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] hover:border-sky-500 text-left flex items-center justify-between gap-2.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                      {React.createElement(SERVICE_ICONS[categoryId], { className: 'w-4 h-4' })}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-slate-400">02 · SERVICE & DEPOT</div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {currentCategory.title} · {assignedDepot}
                      </div>
                    </div>
                  </div>
                  <Pencil className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                </button>

                {/* Summary Row 3: Fault & Severity */}
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="p-2.5 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] hover:border-sky-500 text-left flex items-center justify-between gap-2.5 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] text-slate-400">
                      03 · FAULT & SEVERITY ({severity})
                    </div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {title.trim() || `${currentCategory.shortTitle} fault at ${address}`}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {description.trim() || `Priority escalation to ${assignedDepot}`}
                    </div>
                  </div>
                  <Pencil className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                </button>

                {/* Summary Row 4: Location & Ref # */}
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="p-2.5 border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] hover:border-sky-500 text-left flex items-center justify-between gap-2.5 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-slate-400">
                        04 · WARD {activeWard.wardNumber} LOCATION · {municipalRef || (isEmergency ? 'SOS-BYPASS' : 'AUTO REF')}
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {address}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        GPS {pinLat.toFixed(4)}, {pinLng.toFixed(4)} · Cllr {activeWard.councillor.name}
                      </div>
                    </div>
                  </div>
                  <Pencil className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Survey Footer Controls */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-200 dark:border-white/12 bg-white dark:bg-[#0A0E17] flex items-center justify-between gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)}
              className="min-h-[42px] px-3.5 border border-slate-200 dark:border-white/20 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-3.5 border border-slate-200 dark:border-white/20 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step < 5 ? (
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)}
              className="min-h-[42px] px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {step === 1 && !previewUrl ? (
                <>
                  <span>Skip Photo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : step === 1 && forensics?.triage?.faultTitle ? (
                <>
                  <span>Continue with AI Triage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              ) : step === 4 ? (
                <>
                  <span>Review Summary</span>
                  <Check className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={isAnalyzing || Boolean(isBlockedSynthetic)}
              onClick={handleSubmitFinal}
              className="min-h-[42px] px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Escalate</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
