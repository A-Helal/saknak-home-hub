import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Clock, CheckCircle2, Copy, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingData: {
    vodafone_number: string;
    deposit_amount: number;
    expires_at: string;
    property_title: string;
    booking_id?: string;
  };
}

const PaymentDialog = ({ open, onOpenChange, bookingData }: PaymentDialogProps) => {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!bookingData.expires_at) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(bookingData.expires_at).getTime();
      const distance = expiry - now;

      if (distance < 0) {
        setTimeLeft("انتهت المدة");
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [bookingData.expires_at]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ!",
      description: "تم نسخ الرقم",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">إتمام الحجز</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{bookingData.property_title}</h3>
            <p className="text-sm text-muted-foreground">
              يرجى تحويل مبلغ العربون لإتمام الحجز
            </p>
          </div>

          <div className="bg-secondary/50 p-6 rounded-lg space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">مبلغ العربون</p>
              <p className="text-3xl font-bold">{bookingData.deposit_amount} جنيه</p>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">رقم فودافون كاش</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-xl font-mono font-semibold">{bookingData.vodafone_number}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(bookingData.vodafone_number)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {timeLeft && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 text-destructive">
                <Clock className="h-5 w-5" />
                <div className="text-center">
                  <p className="text-sm font-medium">الوقت المتبقي للدفع</p>
                  <p className="text-2xl font-bold font-mono">{timeLeft}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p>قم بتحويل المبلغ عبر فودافون كاش إلى الرقم المذكور أعلاه</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p>بعد التحويل، سيتم تأكيد الحجز تلقائياً</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p>في حالة عدم الدفع خلال ساعة واحدة، سيتم إلغاء الحجز تلقائياً</p>
            </div>
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            تم الفهم
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;