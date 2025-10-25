// Application constants
export const APP_NAME = "سكنك";
export const CUSTOMER_SERVICE_PHONE = "01128414829";
export const CUSTOMER_SERVICE_EMAIL = "support@saknak.com";

// Validation constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_IMAGES_PER_PROPERTY = 10;

// Grade levels
export const GRADE_LEVELS = [
  { value: "1", label: "المستوى الأول" },
  { value: "2", label: "المستوى الثاني" },
  { value: "3", label: "المستوى الثالث" },
  { value: "4", label: "المستوى الرابع" },
  { value: "5", label: "المستوى الخامس" },
  { value: "excellence", label: "الامتياز" },
  { value: "graduate", label: "خريج" },
] as const;

// Rental types
export const RENTAL_TYPES = {
  apartment: "شقة كاملة",
  room: "غرفة",
  bed: "سرير",
} as const;

// Gender preferences
export const GENDER_PREFERENCES = {
  any: "مختلط",
  male: "ذكور فقط",
  female: "إناث فقط",
} as const;

// Booking statuses
export const BOOKING_STATUSES = {
  pending: "قيد الانتظار",
  accepted: "مقبول",
  rejected: "مرفوض",
  denied: "مرفوض",
  expired: "منتهي",
} as const;

// Property statuses
export const PROPERTY_STATUSES = {
  available: "متاح",
  reserved: "محجوز",
  unavailable: "غير متاح",
} as const;

// Storage bucket names
export const STORAGE_BUCKETS = {
  PROPERTY_IMAGES: 'property-images',
  PROPERTY_VIDEOS: 'property-videos',
  CIVIL_IDS: 'civil_ids',
  OWNERSHIP_DOCS: 'ownership_docs',
  PAYMENT_PROOFS: 'payment_proofs',
} as const;

