import { supabase } from "@/integrations/supabase/client";

// ===============================================================
// PROFILES API
// ===============================================================

export const profilesApi = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserRatings(userId: string) {
    const { data, error } = await supabase
      .from("ratings")
      .select("*")
      .eq("to_user", userId);

    if (error) throw error;
    return data;
  },

  async getAverageRating(userId: string) {
    const { data, error } = await supabase
      .from("ratings")
      .select("stars")
      .eq("to_user", userId);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const sum = data.reduce((acc, rating) => acc + rating.stars, 0);
    return sum / data.length;
  },
};

// ===============================================================
// PROPERTIES API
// ===============================================================

export const propertiesApi = {
  async getProperties(filters?: {
    search?: string;
    rentalType?: string;
    minPrice?: number;
    maxPrice?: number;
    furnished?: boolean;
  }) {
    let query = supabase
      .from("properties")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,address.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      );
    }

    if (filters?.rentalType && filters.rentalType !== "all") {
      query = query.eq("rental_type", filters.rentalType);
    }

    if (filters?.minPrice !== undefined) {
      query = query.gte("price", filters.minPrice);
    }

    if (filters?.maxPrice !== undefined) {
      query = query.lte("price", filters.maxPrice);
    }

    if (filters?.furnished !== undefined) {
      query = query.eq("furnished", filters.furnished);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async getProperty(id: string) {
    const { data, error } = await supabase
      .from("properties")
      .select("*, profiles!properties_owner_id_fkey(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async getOwnerProperties(ownerId: string) {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createProperty(property: any) {
    const { data, error } = await supabase
      .from("properties")
      .insert(property)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProperty(id: string, updates: any) {
    const { data, error } = await supabase
      .from("properties")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProperty(id: string) {
    const { error } = await supabase.from("properties").delete().eq("id", id);

    if (error) throw error;
  },
};

// ===============================================================
// BOOKINGS API
// ===============================================================

export const bookingsApi = {
  async getBookings(userId: string, userType: "student" | "owner") {
<<<<<<< HEAD
    const column = userType === "student" ? "student_id" : "owner_id";

    const { data, error } = await supabase
      .from("booking_requests")
      .select("*, properties(*), profiles!booking_requests_student_id_fkey(*)")
=======
    const column = userType === "student" ? "user_id" : "owner_id";

    const { data, error } = await supabase
      .from("booking_requests")
      .select("*, properties(*), profiles!booking_requests_user_id_fkey(*)")
>>>>>>> dda508213143baa660dba93db988962291c5fe46
      .eq(column, userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createBooking(booking: {
    student_id: string;
    property_id: string;
    owner_id: string;
    message?: string;
  }) {
    const { data, error } = await supabase
      .from("booking_requests")
      .insert(booking)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateBookingStatus(bookingId: string, status: string) {
    const { data, error } = await supabase
      .from("booking_requests")
      .update({ status })
      .eq("id", bookingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRentPayment(bookingId: string, paidDate: string) {
    const { data, error} = await supabase
      .from("booking_requests")
      .update({ rent_paid_date: paidDate })
      .eq("id", bookingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ===============================================================
// NOTIFICATIONS API
// ===============================================================

export const notificationsApi = {
  async getNotifications(userId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return data;
  },

  async markAsRead(notificationId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (error) throw error;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) throw error;
  },

  async deleteNotification(notificationId: string) {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (error) throw error;
  },
};

// ===============================================================
// RATINGS API
// ===============================================================

export const ratingsApi = {
  async getRatings(userId: string) {
    const { data, error } = await supabase
      .from("ratings")
      .select("*, profiles!ratings_from_user_fkey(*)")
      .eq("to_user", userId);

    if (error) throw error;
    return data;
  },

  async createRating(rating: {
    from_user: string;
    to_user: string;
    booking_id: string;
    stars: number;
    comment?: string;
  }) {
    const { data, error } = await supabase
      .from("ratings")
      .insert(rating)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async canRate(bookingId: string, userId: string, userType: "student" | "owner") {
    const { data, error } = await supabase
      .from("booking_requests")
      .select(
        userType === "student" ? "student_can_rate" : "owner_can_rate"
      )
      .eq("id", bookingId)
      .single();

    if (error) throw error;
    return userType === "student"
      ? data.student_can_rate
      : data.owner_can_rate;
  },
};

// ===============================================================
// STORAGE API
// ===============================================================

export const storageApi = {
  async uploadFile(
    bucket: string,
    path: string,
    file: File,
    options?: { upsert?: boolean }
  ) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  },

  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) throw error;
  },
};

// ===============================================================
// GEOCODING API
// ===============================================================

export const geocodingApi = {
  async geocodeAddress(address: string): Promise<{
    lat: number;
    lng: number;
  } | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          address
        )}&format=json&limit=1`,
        {
          headers: {
            "User-Agent": "SaknakApp/1.0",
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }

      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  },
};
<<<<<<< HEAD

=======
>>>>>>> dda508213143baa660dba93db988962291c5fe46
