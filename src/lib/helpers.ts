import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

// ===============================================================
// DATE HELPERS
// ===============================================================

export const formatDate = (date: string | Date): string => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: ar,
  });
};

export const formatFullDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// ===============================================================
// NUMBER HELPERS
// ===============================================================

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
  }).format(price);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat("ar-EG").format(num);
};

// ===============================================================
// STRING HELPERS
// ===============================================================

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
};

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
};

// ===============================================================
// FILE HELPERS
// ===============================================================

export const getFileExtension = (filename: string): string => {
  return filename.slice(filename.lastIndexOf("."));
};

export const generateFileName = (userId: string, originalName: string): string => {
  const extension = getFileExtension(originalName);
  const timestamp = Date.now();
  return `${userId}/${timestamp}${extension}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 بايت";

  const k = 1024;
  const sizes = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// ===============================================================
// ARRAY HELPERS
// ===============================================================

export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const unique = <T>(array: T[]): T[] => {
  return Array.from(new Set(array));
};

// ===============================================================
// DEBOUNCE HELPER
// ===============================================================

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ===============================================================
// RATING HELPERS
// ===============================================================

export const calculateAverageRating = (
  ratings: { stars: number }[]
): number => {
  if (!ratings || ratings.length === 0) return 0;

  const sum = ratings.reduce((acc, rating) => acc + rating.stars, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
};

export const getRatingLabel = (stars: number): string => {
  if (stars >= 4.5) return "ممتاز";
  if (stars >= 3.5) return "جيد جداً";
  if (stars >= 2.5) return "جيد";
  if (stars >= 1.5) return "مقبول";
  return "ضعيف";
};

// ===============================================================
// URL HELPERS
// ===============================================================

export const getGoogleMapsUrl = (lat: number, lng: number): string => {
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

export const getGoogleMapsDirectionsUrl = (lat: number, lng: number): string => {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
};

export const getWhatsAppUrl = (phone: string, message?: string): string => {
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = message ? encodeURIComponent(message) : "";
  return `https://wa.me/${cleanPhone}${message ? `?text=${encodedMessage}` : ""}`;
};

// ===============================================================
// VALIDATION HELPERS
// ===============================================================

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isImage = (url: string): boolean => {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
};

export const isVideo = (url: string): boolean => {
  return /\.(mp4|webm|ogg|mov)$/i.test(url);
};

// ===============================================================
// LOCAL STORAGE HELPERS
// ===============================================================

export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch {
      return defaultValue ?? null;
    }
  },

  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing from localStorage:", error);
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  },
};

