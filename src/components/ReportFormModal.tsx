import React, { useEffect, useRef, useState } from 'react';
import exifr from 'exifr';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  FileWarning,
  Loader2,
  LocateFixed,
  LogIn,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Upload,
  Users,
  X,
} from 'lucide-react';
import samplePipeBurst from '../assets/images/evidence_pipe_burst_1794565148729.jpg';
import sampleSinkhole from '../assets/images/evidence_synthetic_sinkhole_1794565149966.jpg';
import { MUNICIPALITIES, SERVICE_CATEGORIES } from '../data/civicSeedData';
import type {
  CivicReport,
  ExifMetadataPayload,
  ForensicAnalysisResult,
  ServiceCategoryId,
  SeverityLevel,
  WardRecord,
} from '../types/civic';
import { getDepotForCategory, haversineDistanceMeters } from '../utils/wardResolver';
import { generateMunicipalRef, getRefGuidance } from '../utils/municipalRefs';
import { formatSaMobileDisplay, normalizeSaMobile } from '../utils/phone';
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
  onSubmitNewReport: (report: CivicReport, rewardPoints: number, potentialPoints?: number) => void;
  onCorroborateExisting: (
    reportId: string,
    reporterInfo?: { phone?: string | null; name?: string }
  ) => void;
  onViewInFeed?: (reportId: string) => void;
  onGoToProfileSignIn?: () => void;
  signedIn: boolean;
  userMobile?: string;
  userName?: string;
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
  sanitation: [
    {
      label: 'Sewer manhole overflow',
      title: 'Blocked municipal sewer manhole overflowing',
      detail: 'Raw sewage spilling onto residential roadway and stormwater kerb.',
      severity: 'CRITICAL',
    },
    {
      label: 'Blocked sewer line',
      title: 'Main municipal sewer line backing up into properties',
      detail: 'Urgent high-pressure sewer jetting and vacuum truck required.',
      severity: 'HIGH',
    },
    {
      label: 'Pump station fault',
      title: 'Sewer pump station alarm / overflow',
      detail: 'Continuous foul odour and surcharge around sanitation pump station.',
      severity: 'HIGH',
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

const DEFAULT_REPORTER_STREET_SUBURB = 'Kingfisher Dr, Fourways, Sandton, 2055';
const TOTAL_STEPS = 5;

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
  onViewInFeed,
  onGoToProfileSignIn,
  signedIn,
  userMobile = '',
  userName = '',
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [transitionDir, setTransitionDir] = useState<'forward' | 'back'>('forward');
  const [submittedReceipt, setSubmittedReceipt] = useState<{
    report: CivicReport;
    earnedPoints: number;
    potentialPoints: number;
    tierLabel: string;
  } | null>(null);

  // Step 1: Intro & Reporter Info
  const [reporterName, setReporterName] = useState(userName || '');
  const [reporterMobile, setReporterMobile] = useState(userMobile || '');
  const [reporterSuburb, setReporterSuburb] = useState(DEFAULT_REPORTER_STREET_SUBURB);

  const actionableCategories = SERVICE_CATEGORIES.filter((c) => !c.isInfoModule);
  const resolvedInitialCategory: ServiceCategoryId = actionableCategories.some(
    (c) => c.id === initialCategoryId
  )
    ? initialCategoryId
    : 'water';

  // Step 2: The Issue
  const [selectedDepartment, setSelectedDepartment] = useState<ServiceCategoryId | ''>(
    resolvedInitialCategory
  );
  const [categoryId, setCategoryId] = useState<ServiceCategoryId>(resolvedInitialCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Step 3: Exact Location
  const [address, setAddress] = useState('');
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>({
    lat: activeWard.lat,
    lng: activeWard.lng,
  });

  // Step 4: Existing Reference (Optional)
  const [municipalRef, setMunicipalRef] = useState('');

  // Step 5: Evidence & Forensics
  const [severity, setSeverity] = useState<SeverityLevel>(emergencyMode ? 'CRITICAL' : 'MODERATE');
  const [isEmergency, setIsEmergency] = useState(emergencyMode);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [showRefGuide, setShowRefGuide] = useState(false);
  const [pickerBasemap, setPickerBasemap] = useState<BasemapId | undefined>(undefined);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exifData, setExifData] = useState<ExifMetadataPayload | null>(null);
  const [forensics, setForensics] = useState<ForensicAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [addedMeTooIds, setAddedMeTooIds] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const swipeRef = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const safeInitial = SERVICE_CATEGORIES.find((c) => c.id === initialCategoryId && !c.isInfoModule)
        ? initialCategoryId
        : 'water';
      setStep(1);
      setTransitionDir('forward');
      setReporterName(userName || '');
      setReporterMobile(userMobile || '');
      setReporterSuburb(DEFAULT_REPORTER_STREET_SUBURB);
      setSelectedDepartment(safeInitial);
      setCategoryId(safeInitial);
      setTitle('');
      setDescription('');
      setAddress('');
      setMunicipalRef('');
      setShowRefGuide(false);
      setValidationError(null);
      setPreviewUrl(null);
      setExifData(null);
      setForensics(null);
      setAnalysisError(null);
      setPinCoords({ lat: activeWard.lat, lng: activeWard.lng });
      setIsEmergency(emergencyMode);
      setSeverity(emergencyMode ? 'CRITICAL' : 'MODERATE');
      setSubmittedReceipt(null);
      setAddedMeTooIds({});
    }
  }, [isOpen, initialCategoryId, activeWard, emergencyMode, userMobile, userName]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (submittedReceipt && onViewInFeed) {
          onViewInFeed(submittedReceipt.report.id);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, submittedReceipt, onViewInFeed]);

  if (!isOpen) return null;

  const pinLat = pinCoords.lat;
  const pinLng = pinCoords.lng;

  const effectiveCategoryId: ServiceCategoryId = selectedDepartment || categoryId;
  const currentCategory =
    SERVICE_CATEGORIES.find((c) => c.id === effectiveCategoryId) ?? SERVICE_CATEGORIES[0];
  const suggestedCategory =
    SERVICE_CATEGORIES.find((c) => c.id === initialCategoryId && !c.isInfoModule) ?? null;

  const assignedDepot = getDepotForCategory(activeWard, effectiveCategoryId);
  const _municipalityData = MUNICIPALITIES[activeWard.municipalityCode] ?? MUNICIPALITIES['CoJ'];
  const depotEntity =
    _municipalityData.entities.find((e) =>
      assignedDepot.toLowerCase().includes(e.name.split(' ')[0].toLowerCase())
    ) ?? _municipalityData.entities[0];
  const refGuidance = getRefGuidance(assignedDepot, depotEntity.handle, depotEntity.slaHours);

  const nearbyDuplicate = selectedDepartment
    ? existingReports.find(
        (r) =>
          r.wardId === activeWard.id &&
          r.categoryId === selectedDepartment &&
          r.status !== 'Resolved' &&
          r.status !== 'Blocked by AI Forensics'
      )
    : undefined;

  const isBlockedSynthetic =
    forensics?.authenticityStatus === 'FLAGGED_SYNTHETIC' || forensics?.isAiGenerated;

  const mapDepartmentToCategory = (dept: string): ServiceCategoryId => {
    const d = dept.toLowerCase();
    if (d.includes('sanit') || d.includes('sewer')) return 'sanitation';
    if (d.includes('water')) return 'water';
    if (d.includes('electric') || d.includes('power')) return 'electricity';
    if (d.includes('road')) return 'roads';
    if (d.includes('street') || d.includes('signal')) return 'streetlights';
    if (d.includes('waste') || d.includes('refuse')) return 'waste';
    if (d.includes('park') || d.includes('tree')) return 'parks';
    if (d.includes('safe') || d.includes('police')) return 'safety';
    return effectiveCategoryId;
  };

  const goToStep = (next: 1 | 2 | 3 | 4 | 5) => {
    setTransitionDir(next >= step ? 'forward' : 'back');
    setValidationError(null);
    setStep(next);
  };

  const validateCurrentStep = (currentStep: 1 | 2 | 3 | 4 | 5): string | null => {
    if (currentStep === 1) {
      if (!reporterName.trim()) {
        return 'Please enter your name before continuing.';
      }
      if (!reporterMobile.trim()) {
        return 'Please enter your mobile number so you can claim CivicRewards points and receive councillor updates.';
      }
      if (!normalizeSaMobile(reporterMobile)) {
        return 'Please enter a valid South African mobile number (e.g. 082 123 4567 or +27 82 123 4567).';
      }
      if (!reporterSuburb.trim()) {
        return 'Please enter your street address and suburb before continuing.';
      }
    }
    if (currentStep === 2) {
      if (!selectedDepartment) {
        return 'Please select the municipal department handling this issue.';
      }
    }
    return null;
  };

  const handleNextStep = () => {
    const error = validateCurrentStep(step);
    if (error) {
      setValidationError(error);
      return;
    }
    if (step < TOTAL_STEPS) {
      goToStep((step + 1) as 1 | 2 | 3 | 4 | 5);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      goToStep((step - 1) as 1 | 2 | 3 | 4 | 5);
    }
  };

  const handleEnterAdvance = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNextStep();
    }
  };

  const runGeminiForensics = async (
    base64: string,
    mimeType: string,
    extractedExif: ExifMetadataPayload
  ) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const locationContext = address.trim() || reporterSuburb.trim() || activeWard.suburbs[0];
      const response = await fetch('/api/forensics/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          exifMetadata: extractedExif,
          reportedAddress: `${locationContext} (${pinLat}, ${pinLng})`,
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
        if (result.triage.department && !selectedDepartment) {
          const detectedCat = mapDepartmentToCategory(result.triage.department);
          setCategoryId(detectedCat);
          setSelectedDepartment(detectedCat);
        }
        if (result.triage.faultTitle && !title.trim()) {
          setTitle(result.triage.faultTitle);
        }
        if (result.triage.engineeringSummary && !description.trim()) {
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
      setAnalysisError('Video queued. Capture a still photo for Gemini Vision forensics or submit now.');
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
      const fixedLat = Number(lat.toFixed(5));
      const fixedLng = Number(lng.toFixed(5));
      setPinCoords({ lat: fixedLat, lng: fixedLng });
      setAddress((prev) =>
        prev.trim()
          ? prev
          : `${activeWard.corridors?.[0] || 'Near Ward Corridor'}, ${activeWard.suburbs[0]} (GPS ${fixedLat}, ${fixedLng})`
      );
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

    const step1Error = validateCurrentStep(1);
    if (step1Error) {
      setValidationError(step1Error);
      goToStep(1);
      return;
    }
    const step2Error = validateCurrentStep(2);
    if (step2Error) {
      setValidationError(step2Error);
      goToStep(2);
      return;
    }

    const potentialPoints =
      forensics?.authenticityStatus === 'VERIFIED' ? 50 : previewUrl ? 25 : 15;
    const tierLabel =
      forensics?.authenticityStatus === 'VERIFIED'
        ? 'Verified Live Capture (EXIF + GPS)'
        : previewUrl
          ? 'Photo Evidence Attached'
          : 'Standard Fault Submission';
    const rewardPoints = signedIn ? potentialPoints : 0;
    const newId = `CP-2026-${Math.floor(1050 + Math.random() * 8900)}`;

    const parsedSuburbParts = reporterSuburb
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const resolvedSuburb = parsedSuburbParts[1] || parsedSuburbParts[0] || activeWard.suburbs[0];
    const resolvedAddress =
      address.trim() ||
      reporterSuburb.trim() ||
      `${activeWard.corridors[0] || 'Main Rd'}, ${activeWard.suburbs[0]}`;
    const resolvedTitle =
      title.trim() ||
      (description.trim()
        ? description.trim().slice(0, 72)
        : `${currentCategory.shortTitle} fault at ${resolvedAddress}`);

    const normalizedPhone = normalizeSaMobile(reporterMobile) || reporterMobile.trim();

    const report: CivicReport = {
      id: newId,
      wardId: activeWard.id,
      municipalityCode: activeWard.municipalityCode,
      wardNumber: activeWard.wardNumber,
      suburb: resolvedSuburb,
      categoryId: effectiveCategoryId,
      departmentLabel: currentCategory.title,
      title: resolvedTitle,
      description:
        description.trim() ||
        `Reported via CivicRewards conversational wizard for ${assignedDepot}.`,
      address: resolvedAddress,
      lat: pinLat,
      lng: pinLng,
      municipalRef: isEmergency
        ? municipalRef.trim() || 'SOS-BYPASS'
        : municipalRef.trim() || generateMunicipalRef(activeWard.municipalityCode, effectiveCategoryId),
      status: isEmergency ? 'Escalated to Depot' : 'Logged',
      severity,
      isEmergency,
      clusteredHouseholds: 1,
      createdAtIso: new Date().toISOString(),
      timeAgoLabel: 'Just now',
      slaDeadlineHours: currentCategory.slaHours || 24,
      slaElapsedHours: 0,
      assignedDepot,
      reporterName: reporterName.trim() || (signedIn ? 'You (Ward Resident)' : 'Guest Resident'),
      reporterPhone: normalizedPhone,
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
        notes: forensics?.forensicNotes ?? 'Submitted through 5-step conversational wizard.',
      },
      escalationLog: [
        `Logged to ${activeWard.municipalityCode} Ward ${activeWard.wardNumber} Live Feed`,
        `Routed to ${activeWard.councillor.name} & ${assignedDepot}`,
      ],
      verifiedByResidents: 1,
    };

    onSubmitNewReport(report, rewardPoints, potentialPoints);
    setSubmittedReceipt({
      report,
      earnedPoints: rewardPoints,
      potentialPoints,
      tierLabel,
    });
  };

  const handleDismissSubmitted = () => {
    if (submittedReceipt && onViewInFeed) {
      onViewInFeed(submittedReceipt.report.id);
    } else {
      onClose();
    }
  };

  const presets = selectedDepartment ? QUICK_FAULT_PRESETS[selectedDepartment] ?? [] : [];
  const rewardPreview = signedIn
    ? forensics?.authenticityStatus === 'VERIFIED'
      ? 50
      : previewUrl
        ? 25
        : 15
    : 0;
  const progressPercent = (step / TOTAL_STEPS) * 100;

  if (submittedReceipt) {
    const { report, earnedPoints, potentialPoints, tierLabel } = submittedReceipt;
    return (
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) handleDismissSubmitted();
        }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 dark:bg-slate-950/75 backdrop-blur-sm ui-backdrop-enter p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-submitted-title"
      >
        <div className="w-full max-w-lg flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] shadow-2xl overflow-hidden ui-modal-enter">
          {/* CivicRewards Branded Top Bar */}
          <div className="shrink-0 px-5 sm:px-6 pt-4 pb-3 border-b border-slate-300 dark:border-white/[0.08] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/assets/logo-mark.png"
                alt="CivicRewards logo"
                className="w-8 h-8 rounded-lg bg-white p-0.5 border border-slate-300 dark:border-white/15 object-contain shrink-0"
              />
              <div className="min-w-0">
                <div className="font-display text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  CivicRewards
                </div>
                <div className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 truncate tabular-nums">
                  {report.id} · Ward {activeWard.wardNumber}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissSubmitted}
              aria-label="Close and view live feed"
              className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-400 cursor-pointer shrink-0 transition-colors duration-150"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centered Report Submitted Confirmation */}
          <div className="p-6 sm:p-7 flex flex-col items-center text-center gap-4 overflow-y-auto max-h-[78dvh]">
            <h2
              id="report-submitted-title"
              className="font-display text-2xl sm:text-[26px] font-bold text-slate-900 dark:text-white tracking-tight"
            >
              Report Submitted!
            </h2>

            {/* Large Green Checkmark Ring */}
            <div className="w-24 h-24 rounded-full border-[5px] border-emerald-700 dark:border-emerald-400 bg-emerald-600/12 dark:bg-emerald-400/10 flex items-center justify-center shadow-sm">
              <Check className="w-12 h-12 text-emerald-700 dark:text-emerald-400 stroke-[3]" />
            </div>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-md">
              Your submission has been logged for{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {activeWard.municipalityCode} Ward {activeWard.wardNumber} ({report.suburb})
              </span>{' '}
              and routed to{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {report.assignedDepot}
              </span>{' '}
              &amp; {activeWard.councillor.name}.
            </p>

            {/* Report Reference Summary */}
            <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.08] bg-slate-100/80 dark:bg-white/[0.03] flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11px] font-mono text-slate-700 dark:text-slate-300 tabular-nums">
              <span className="font-bold text-slate-900 dark:text-white">{report.id}</span>
              <span aria-hidden="true">·</span>
              <span>Ref: {report.municipalRef || 'Pending'}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                {currentCategory.shortTitle}
              </span>
            </div>

            {/* Points Earned (Signed In) vs Missed Points Upsell (Guest) */}
            {signedIn ? (
              <div className="w-full p-4 rounded-2xl border border-emerald-600/50 bg-emerald-600/10 dark:bg-emerald-500/10 text-left flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                      +{earnedPoints} Civic Credits Earned
                    </span>
                    <span className="font-mono text-xs font-extrabold text-emerald-800 dark:text-emerald-300 tabular-nums">
                      +{earnedPoints} CR
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 dark:text-emerald-200/85">
                    {tierLabel} · Credited to your CivicRewards balance.
                    {report.reporterPhone
                      ? ` Number ${formatSaMobileDisplay(report.reporterPhone)} shared with Ward Councillor for coordination & verification.`
                      : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full p-4 rounded-2xl border border-amber-600/50 bg-amber-500/15 dark:bg-amber-500/10 text-left space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-sm font-bold text-amber-950 dark:text-amber-300">
                      You could have earned +{potentialPoints} Civic Credits!
                    </div>
                    <p className="text-xs text-amber-950/90 dark:text-amber-100/80 leading-relaxed">
                      {report.reporterPhone
                        ? `+${potentialPoints} CR reserved for ${formatSaMobileDisplay(report.reporterPhone)}. Sign in with this mobile number on Profile → Points to claim your credits. Your number has also been shared with ${activeWard.councillor.name} for coordination & verification.`
                        : 'Submitted as Guest (0 CR). Sign up now to earn Civic Credits for reporting faults, +1 Me Too corroborations, and verifying fixes.'}
                    </p>
                  </div>
                </div>
                {onGoToProfileSignIn && (
                  <button
                    type="button"
                    onClick={onGoToProfileSignIn}
                    className="w-full min-h-[40px] px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign Up Now to Claim +{potentialPoints} CR</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Action to Live Ward Feed */}
          <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-slate-300 dark:border-white/[0.08] flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDismissSubmitted}
              className="w-full min-h-[46px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150 shadow-sm"
            >
              <span>View Report in Live Feed</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-950/65 backdrop-blur-sm ui-backdrop-enter p-0 sm:p-4"
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
            ignore: Boolean(t.closest('.leaflet-container') || t.closest('input, textarea, select')),
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
            if (dx > 0 && step > 1) handlePrevStep();
            else if (dx < 0 && step < TOTAL_STEPS) handleNextStep();
          }
        }}
        className="w-full max-w-xl h-[92dvh] sm:h-[650px] max-h-[94dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#111827] border border-slate-300 dark:border-white/[0.08] shadow-2xl overflow-hidden ui-modal-enter overscroll-contain"
      >
        {/* Slim Progress Bar at the Very Top */}
        <div className="shrink-0 h-1.5 w-full bg-slate-200 dark:bg-white/[0.08]" aria-hidden="true">
          <div
            className="h-full bg-emerald-600 dark:bg-emerald-400 transition-[width] duration-200 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Clean Step Counter Header */}
        <div className="shrink-0 px-5 sm:px-6 pt-4 pb-3 border-b border-slate-300 dark:border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 text-xs text-slate-600 dark:text-slate-400">
            <img
              src="/assets/logo-mark.png"
              alt="CivicRewards logo"
              className="w-7 h-7 rounded-lg bg-white p-0.5 border border-slate-300 dark:border-white/15 object-contain shrink-0"
            />
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">
              Step {step} of {TOTAL_STEPS}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
              Ward {activeWard.wardNumber} ({activeWard.suburbs[0]})
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close report wizard"
            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-400 cursor-pointer shrink-0 transition-colors duration-150"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversational Step Viewport */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto overscroll-contain flex flex-col justify-between gap-4">
          {isEmergency && (
            <div className="shrink-0 px-3.5 py-2.5 rounded-xl bg-red-600/10 border border-red-600/40 flex items-center justify-between gap-2 text-xs text-red-800 dark:text-red-300">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-700 dark:text-red-400" />
                <span className="truncate font-semibold">Emergency SOS priority active</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEmergency(false)}
                className="underline font-semibold shrink-0 cursor-pointer"
              >
                Turn off
              </button>
            </div>
          )}

          {validationError && (
            <div
              role="alert"
              className="shrink-0 px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-400 dark:border-red-800 text-xs font-medium text-red-800 dark:text-red-200 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-700 dark:text-red-400" />
              <span>{validationError}</span>
            </div>
          )}

          <div
            key={step}
            className={`flex-1 flex flex-col justify-center gap-5 min-h-0 ${
              transitionDir === 'forward' ? 'wizard-step-forward' : 'wizard-step-back'
            }`}
          >
            {/* STEP 1: INTRO & REPORTER INFO */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <h2
                    id="report-modal-title"
                    className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance"
                  >
                    Hi there! Who is reporting this issue today?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    {signedIn
                      ? 'Used to log your ward ticket and credit Civic Rewards.'
                      : 'Submitting as Guest (0 CR). Sign in on Profile anytime to earn Civic Credits.'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="wizard-reporter-name"
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Your Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="wizard-reporter-name"
                      type="text"
                      value={reporterName}
                      onChange={(e) => {
                        setReporterName(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      onKeyDown={handleEnterAdvance}
                      placeholder="e.g. Sipho Ndlovu"
                      autoComplete="name"
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/25 transition-[border-color,box-shadow,background-color] duration-150"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="wizard-reporter-mobile"
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Mobile Number (SA) <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-600 dark:text-slate-400 pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="wizard-reporter-mobile"
                        type="tel"
                        inputMode="tel"
                        value={reporterMobile}
                        onChange={(e) => {
                          setReporterMobile(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        onKeyDown={handleEnterAdvance}
                        placeholder="082 123 4567 or +27 82 123 4567"
                        autoComplete="tel"
                        className="w-full h-12 pl-10 pr-3.5 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-sm font-mono tabular-nums text-slate-950 dark:text-white placeholder:font-sans placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/25 transition-[border-color,box-shadow,background-color] duration-150"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                      Use this number to claim CivicRewards points for reporting. Reporting numbers are shared with your Ward Councillor for coordination, escalation, and verification.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="wizard-reporter-suburb"
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Street Address (Street and Suburb) <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="wizard-reporter-suburb"
                      type="text"
                      value={reporterSuburb}
                      onChange={(e) => {
                        setReporterSuburb(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      onKeyDown={handleEnterAdvance}
                      placeholder="Kingfisher Dr, Fourways, Sandton, 2055"
                      autoComplete="street-address"
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/25 transition-[border-color,box-shadow,background-color] duration-150"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-500 font-mono">
                  Press Enter to continue.
                </p>
              </div>
            )}

            {/* STEP 2: THE ISSUE */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2
                    id="report-modal-title"
                    className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance"
                  >
                    What issue are you reporting, and which department handles it?
                  </h2>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="wizard-department"
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Department <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="wizard-department"
                        value={selectedDepartment}
                        onChange={(e) => {
                          const val = e.target.value as ServiceCategoryId | '';
                          setSelectedDepartment(val);
                          if (val) setCategoryId(val);
                          if (validationError) setValidationError(null);
                        }}
                        className="w-full h-12 pl-3.5 pr-10 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-sm text-slate-950 dark:text-white appearance-none focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/25 transition-[border-color,box-shadow,background-color] duration-150 cursor-pointer"
                      >
                        <option value="">Select a department</option>
                        {actionableCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.title} ({cat.entity})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-700 dark:text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </div>

                    {suggestedCategory && selectedDepartment !== suggestedCategory.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDepartment(suggestedCategory.id);
                          setCategoryId(suggestedCategory.id);
                          setValidationError(null);
                        }}
                        className="mt-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Switch back to {suggestedCategory.title}
                      </button>
                    )}
                  </div>

                  {nearbyDuplicate && (() => {
                    const isMeTooAdded = Boolean(addedMeTooIds[nearbyDuplicate.id]);
                    return (
                      <div className="p-3 rounded-xl border border-amber-500/50 bg-amber-500/10 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-300">
                            <Users className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate tabular-nums">
                              {nearbyDuplicate.clusteredHouseholds} Neighbours already logged{' '}
                              {currentCategory.shortTitle}
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-800 dark:text-amber-200/80 truncate">
                            {nearbyDuplicate.title} · {nearbyDuplicate.address}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isMeTooAdded}
                          onClick={() => {
                            if (isMeTooAdded) return;
                            onCorroborateExisting(nearbyDuplicate.id, {
                              phone:
                                normalizeSaMobile(reporterMobile) ||
                                reporterMobile.trim() ||
                                userMobile ||
                                null,
                              name: reporterName.trim() || userName || undefined,
                            });
                            setAddedMeTooIds((prev) => ({ ...prev, [nearbyDuplicate.id]: true }));
                          }}
                          className={`shrink-0 min-h-[36px] px-3 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1.5 transition-[background-color,transform] duration-150 ${
                            isMeTooAdded
                              ? 'bg-emerald-600 cursor-default'
                              : 'bg-amber-600 hover:bg-amber-700 cursor-pointer active:scale-[0.98]'
                          }`}
                        >
                          {isMeTooAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[2.75]" />
                              <span>Me Too Added</span>
                            </>
                          ) : (
                            <span>+1 Me Too</span>
                          )}
                        </button>
                      </div>
                    );
                  })()}

                  <div>
                    <label
                      htmlFor="wizard-problem-description"
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Problem Description
                    </label>
                    <textarea
                      id="wizard-problem-description"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the issue (e.g. Water gushing across left lane, active for 6 hours, hazard to vehicles)"
                      className="w-full p-3.5 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/25 transition-[border-color,box-shadow,background-color] duration-150"
                    />
                  </div>

                  {presets.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Quick {currentCategory.shortTitle} presets:
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
                                if (preset.severity === 'CRITICAL') setIsEmergency(true);
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer active:scale-[0.98] transition-[border-color,background-color,transform] duration-150 ${
                                active
                                  ? 'border-emerald-700 bg-emerald-600 text-white'
                                  : 'border-slate-300 dark:border-white/12 bg-slate-50 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 hover:border-emerald-700/70'
                              }`}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: EXACT LOCATION */}
            {step === 3 && (
              <div className="space-y-3.5 flex-1 flex flex-col justify-between min-h-0">
                <div className="space-y-3 shrink-0">
                  <h2
                    id="report-modal-title"
                    className="font-display text-xl sm:text-2xl font-bold text-slate-950 dark:text-white tracking-tight text-balance"
                  >
                    Where is this happening?
                  </h2>

                  <div>
                    <label
                      htmlFor="wizard-exact-location"
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Street Address / Intersection / Landmark
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="wizard-exact-location"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onKeyDown={handleEnterAdvance}
                        placeholder="e.g. Corner of Witkoppen Rd & Leslie Ave"
                        className="flex-1 min-w-0 h-11 px-3.5 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-sm text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/25 transition-[border-color,box-shadow,background-color] duration-150"
                      />
                      <button
                        type="button"
                        onClick={handleUseCurrentGps}
                        disabled={isLocatingGps}
                        className="shrink-0 h-11 px-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 active:scale-[0.98] transition-transform duration-150"
                      >
                        {isLocatingGps ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LocateFixed className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                        )}
                        <span className="whitespace-nowrap">
                          {isLocatingGps ? 'Locating...' : 'Use GPS'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Interactive Leaflet Map Pinning */}
                <div className="relative flex-1 min-h-[175px] rounded-xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden">
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
                  <div className="absolute top-2.5 left-2.5 z-[400] flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-900/90 border border-white/20">
                    {BASEMAP_ORDER.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPickerBasemap(id)}
                        title={BASEMAPS[id].label}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold cursor-pointer transition-colors duration-150 ${
                          (pickerBasemap ?? (darkMode ? 'dark' : 'streets')) === id
                            ? 'bg-white text-slate-900'
                            : 'text-white/80'
                        }`}
                      >
                        {BASEMAPS[id].shortLabel}
                      </button>
                    ))}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 z-[400] px-2.5 py-1 rounded-lg bg-slate-950/80 text-white font-mono text-[10px] tabular-nums flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>
                      {pinLat.toFixed(4)}, {pinLng.toFixed(4)} · Tap map to move pin
                    </span>
                  </div>
                </div>

                {/* 1-Tap Ward Corridor Quick Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 shrink-0 font-semibold">Corridors:</span>
                  {activeWard.corridors.map((street) => (
                    <button
                      key={street}
                      type="button"
                      onClick={() => setAddress(`${street}, ${activeWard.suburbs[0]}`)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/12 bg-slate-50 dark:bg-white/[0.04] hover:border-emerald-700 text-[11px] font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                    >
                      {street}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: EXISTING REFERENCE (OPTIONAL) */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2
                    id="report-modal-title"
                    className="font-display text-xl sm:text-2xl font-bold text-slate-950 dark:text-white tracking-tight text-balance"
                  >
                    Have you already logged this with the city?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Only if you already logged this with the department yourself — leave blank otherwise. Looks like CPWEB5012172 or JWAPP-40128554.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="wizard-municipal-ref"
                      className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
                    >
                      Municipal Reference Number
                    </label>
                    <input
                      id="wizard-municipal-ref"
                      type="text"
                      value={municipalRef}
                      onChange={(e) => setMunicipalRef(e.target.value)}
                      onKeyDown={handleEnterAdvance}
                      placeholder="Enter your ref number"
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-500 dark:border-white/15 bg-white dark:bg-white/[0.04] text-sm font-mono tabular-nums text-slate-950 dark:text-white placeholder:font-sans placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-[#0B0F17] focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/30 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/25 transition-[border-color,box-shadow,background-color] duration-150"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMunicipalRef('');
                      goToStep(5);
                    }}
                    className="w-full h-12 px-4 rounded-xl border border-slate-400 dark:border-white/12 bg-slate-50 dark:bg-white/[0.04] hover:border-emerald-700 hover:bg-emerald-600/10 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-[border-color,background-color,transform] duration-150"
                  >
                    <SkipForward className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>Skip / No Ref Number</span>
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowRefGuide((v) => !v)}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {showRefGuide ? 'Hide depot reference guide' : 'How do I get my official ref?'}
                  </button>
                  {showRefGuide && (
                    <ol className="mt-2 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-decimal list-inside rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/[0.08] p-3.5">
                      {refGuidance.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                      <li className="font-mono text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                        {refGuidance.depot} · {refGuidance.entityHandle} · {refGuidance.slaHours}h SLA
                      </li>
                    </ol>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: PHOTO EVIDENCE & SUBMIT */}
            {step === 5 && (
              <div className="space-y-4 flex-1 flex flex-col justify-between min-h-0">
                <div className="space-y-1 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <h2
                      id="report-modal-title"
                      className="font-display text-xl sm:text-2xl font-bold text-slate-950 dark:text-white tracking-tight text-balance"
                    >
                      {signedIn ? 'Want to earn +50 Bonus Credits?' : 'Add Photo or Video Evidence'}
                    </h2>
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0 tabular-nums">
                      {signedIn ? `+${rewardPreview} CR` : 'Guest · 0 CR'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    {signedIn
                      ? 'Add a quick photo or video of the issue to verify your report and boost your rewards.'
                      : 'Add a quick photo or video of the issue. Sign in on Profile to earn Civic Credits.'}
                  </p>
                </div>

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
                  <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
                    <div className="relative flex-1 min-h-[150px] max-h-[220px] rounded-xl bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] overflow-hidden">
                      <img
                        src={previewUrl}
                        alt="Uploaded civic fault evidence"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-slate-950/80 text-white text-xs font-semibold border border-white/20 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                      >
                        Replace Photo
                      </button>
                    </div>

                    {isAnalyzing ? (
                      <div className="p-3 rounded-xl border border-emerald-600/30 bg-emerald-600/10 flex items-center gap-2.5 text-xs text-slate-800 dark:text-slate-100">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Verifying EXIF GPS & image authenticity...</span>
                      </div>
                    ) : forensics ? (
                      <div
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
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
                                ? signedIn
                                  ? 'Verified Live Capture (+50 CR)'
                                  : 'Verified Live Capture (Guest)'
                                : forensics.authenticityStatus === 'FLAGGED_SYNTHETIC'
                                  ? 'Synthetic Media Blocked'
                                  : 'Metadata Stripped (Manual Review)'}
                            </span>
                          </span>
                          <span className="font-mono text-[11px] tabular-nums">
                            {Math.round(forensics.confidenceScore * 100)}%
                          </span>
                        </div>
                        <p className="text-[11px] line-clamp-2">{forensics.forensicNotes}</p>
                      </div>
                    ) : analysisError ? (
                      <div className="p-2.5 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
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
                    className="flex-1 min-h-[170px] rounded-2xl border-2 border-dashed border-slate-400 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] p-5 flex flex-col items-center justify-center text-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-600/15 border border-emerald-700/35 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-xs">
                      <div className="text-sm font-semibold text-slate-950 dark:text-white">
                        Upload photo or video evidence
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {signedIn
                          ? 'Verified photo earns +50 CR · Text-only earns +15 CR.'
                          : 'Guest report earns 0 CR · Sign in on Profile to earn Civic Credits.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[44px] px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Take Photo / Upload</span>
                    </button>
                  </div>
                )}

                <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-300 dark:border-white/[0.08]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
                      <Sparkles className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> Sample:
                    </span>
                    {SAMPLE_TEST_MEDIA.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => void handleLoadSample(sample)}
                        className="px-2.5 py-1 rounded-lg border border-slate-400 dark:border-white/12 bg-white dark:bg-white/[0.04] hover:border-emerald-700 text-[11px] font-semibold text-slate-800 dark:text-slate-200 cursor-pointer active:scale-[0.98] transition-transform duration-150"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate">
                    {reporterName.trim() || 'Reporter'} · {currentCategory.shortTitle}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pinned Conversational Footer: Back & Next / Submit Report */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-slate-300 dark:border-white/[0.08] flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={step === 1}
            onClick={handlePrevStep}
            className="min-h-[44px] px-4 rounded-xl border border-slate-400 dark:border-white/12 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="min-h-[44px] px-5 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isAnalyzing || Boolean(isBlockedSynthetic)}
              onClick={handleSubmitFinal}
              className="min-h-[44px] px-6 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-wide flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-[background-color,transform] duration-150"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isAnalyzing ? 'Checking Photo...' : 'Submit Report'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
