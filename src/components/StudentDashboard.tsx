import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import PropertyCard from "./PropertyCard";
import PaymentDialog from "./PaymentDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@supabase/supabase-js";

const StudentDashboard = () => {
  const { toast } = useToast();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [rentalTypeFilter, setRentalTypeFilter] = useState<string>("all");
  const [session, setSession] = useState<Session | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    fetchProperties();
    fetchRecommendations();

    return () => subscription.unsubscribe();
  }, []);

  const fetchProperties = async () => {
    try {
      let query = supabase
        .from("properties")
        .select("*")
        .neq("status", "reserved") // Hide reserved properties
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل العقارات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const { data, error } = await supabase.functions.invoke('recommend-properties', {
        body: {
          preferences: {
            rental_type: rentalTypeFilter !== 'all' ? rentalTypeFilter : null,
            search_term: searchTerm || null
          }
        }
      });

      if (error) throw error;
      
      if (data?.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (error: any) {
      console.error("Error fetching recommendations:", error);
      // Silently fail for recommendations
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleBookingRequest = async (propertyId: string) => {
    if (!session?.user) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      const property = properties.find((p) => p.id === propertyId);
      if (!property) return;

      const { data: bookingData, error } = await supabase
        .from("booking_requests")
        .insert({
          property_id: propertyId,
          student_id: session.user.id,
          owner_id: property.owner_id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Show payment dialog
      setCurrentBooking({
        vodafone_number: bookingData.vodafone_number,
        deposit_amount: bookingData.deposit_amount,
        expires_at: bookingData.expires_at,
        property_title: property.title,
      });
      setPaymentDialogOpen(true);

      toast({
        title: "تم إرسال الطلب!",
        description: "يرجى إتمام الدفع خلال ساعة واحدة",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      rentalTypeFilter === "all" || property.rental_type === rentalTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ابحث عن سكنك المثالي</h1>
        <p className="text-muted-foreground">
          اكتشف مئات الخيارات قرب جامعتك
        </p>
      </div>

      {/* AI Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">موصى به لك</h2>
              <p className="text-sm text-muted-foreground">اقتراحات ذكية بناءً على تفضيلاتك</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchRecommendations}
              disabled={loadingRecommendations}
            >
              {loadingRecommendations ? "جاري التحديث..." : "تحديث"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recommendations.slice(0, 4).map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onAction={handleBookingRequest}
                actionLabel="طلب حجز"
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="ابحث بالعنوان أو المنطقة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={rentalTypeFilter} onValueChange={setRentalTypeFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="نوع السكن" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="apartment">شقة كاملة</SelectItem>
            <SelectItem value="room">غرفة</SelectItem>
            <SelectItem value="bed">سرير</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">لا توجد عقارات متاحة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onAction={handleBookingRequest}
              actionLabel="طلب حجز"
            />
          ))}
        </div>
      )}

      {paymentDialogOpen && currentBooking && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          bookingData={currentBooking}
        />
      )}
    </div>
  );
};

export default StudentDashboard;