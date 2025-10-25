// ===============================================================
// ERROR HANDLING UTILITIES
// ===============================================================

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const parseSupabaseError = (error: any): string => {
  if (!error) return "حدث خطأ غير معروف";

  // Handle Supabase specific errors
  if (error.code === "23505") {
    return "البيانات موجودة مسبقاً";
  }

  if (error.code === "23503") {
    return "البيانات المرتبطة غير موجودة";
  }

  if (error.code === "42P01") {
    return "جدول البيانات غير موجود";
  }

  if (error.code === "PGRST116") {
    return "لا توجد بيانات";
  }

  // Auth errors
  if (error.message?.includes("Invalid login credentials")) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  }

  if (error.message?.includes("User already registered")) {
    return "البريد الإلكتروني مسجل مسبقاً";
  }

  if (error.message?.includes("Email not confirmed")) {
    return "يرجى تأكيد البريد الإلكتروني";
  }

  // Storage errors
  if (error.message?.includes("The resource already exists")) {
    return "الملف موجود مسبقاً";
  }

  if (error.message?.includes("Payload too large")) {
    return "حجم الملف كبير جداً";
  }

  // Default to error message
  return error.message || "حدث خطأ غير متوقع";
};

export const handleError = (error: any, toast: any) => {
  console.error("Error:", error);

  const message = parseSupabaseError(error);

  toast({
    title: "خطأ",
    description: message,
    variant: "destructive",
  });
};

export const handleSuccess = (toast: any, message: string) => {
  toast({
    title: "نجح!",
    description: message,
  });
};

