import { MAX_FILE_SIZE, MAX_VIDEO_SIZE } from "./constants";

// ===============================================================
// FILE VALIDATION
// ===============================================================

export const validateFile = (
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } => {
  const maxSize = options.maxSize || MAX_FILE_SIZE;
  const allowedTypes = options.allowedTypes || ["image/*", "application/pdf"];

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `حجم الملف يجب أن يكون أقل من ${(maxSize / 1024 / 1024).toFixed(0)} ميجابايت`,
    };
  }

  // Check file type
  const fileType = file.type;
  const isAllowed = allowedTypes.some((type) => {
    if (type.endsWith("/*")) {
      const prefix = type.split("/")[0];
      return fileType.startsWith(prefix + "/");
    }
    return fileType === type;
  });

  if (!isAllowed) {
    return {
      valid: false,
      error: "نوع الملف غير مدعوم",
    };
  }

  return { valid: true };
};

export const validateImage = (file: File) => {
  return validateFile(file, {
    maxSize: MAX_FILE_SIZE,
    allowedTypes: ["image/*"],
  });
};

export const validateVideo = (file: File) => {
  return validateFile(file, {
    maxSize: MAX_VIDEO_SIZE,
    allowedTypes: ["video/*"],
  });
};

export const validateDocument = (file: File) => {
  return validateFile(file, {
    maxSize: MAX_FILE_SIZE,
    allowedTypes: ["image/*", "application/pdf"],
  });
};

// ===============================================================
// FORM VALIDATION
// ===============================================================

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+2)?01[0-2,5]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
};

export const validatePassword = (password: string): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validatePrice = (price: number): boolean => {
  return price > 0 && price <= 1000000;
};

export const validateCoordinates = (lat?: number, lng?: number): boolean => {
  if (lat === undefined || lng === undefined) return true;
  return (
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
};

// ===============================================================
// PROFILE VALIDATION
// ===============================================================

export const validateStudentProfile = (profile: {
  civil_id_url?: string;
  city?: string;
  area?: string;
  college?: string;
  university?: string;
  level?: string;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!profile.civil_id_url) errors.push("يرجى رفع البطاقة المدنية");
  if (!profile.city) errors.push("يرجى إدخال المدينة");
  if (!profile.area) errors.push("يرجى إدخال المنطقة");
  if (!profile.college) errors.push("يرجى إدخال الكلية");
  if (!profile.university) errors.push("يرجى إدخال الجامعة");
  if (!profile.level) errors.push("يرجى اختيار المستوى الدراسي");

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateOwnerProfile = (profile: {
  ownership_image_url?: string;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!profile.ownership_image_url) {
    errors.push("يرجى رفع وثيقة ملكية العقار");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ===============================================================
// PROPERTY VALIDATION
// ===============================================================

export const validateProperty = (property: {
  title?: string;
  address?: string;
  price?: number;
  rental_type?: string;
  images?: File[];
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!property.title || property.title.length < 5) {
    errors.push("عنوان العقار يجب أن يكون 5 أحرف على الأقل");
  }

  if (!property.address || property.address.length < 10) {
    errors.push("العنوان يجب أن يكون 10 أحرف على الأقل");
  }

  if (!property.price || property.price <= 0) {
    errors.push("السعر يجب أن يكون أكبر من صفر");
  }

  if (!property.rental_type) {
    errors.push("يرجى اختيار نوع السكن");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

