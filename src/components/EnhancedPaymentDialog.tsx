import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EnhancedPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  propertyTitle: string;
  depositAmount: number;
  fullInsuranceAmount: number;
}

export const EnhancedPaymentDialog = ({
  open,
  onOpenChange,
  bookingId,
  propertyTitle,
  depositAmount,
  fullInsuranceAmount,
}: EnhancedPaymentDialogProps) => {
  const { toast } = useToast();
  const [paymentOption, setPaymentOption] = useState<"deposit" | "full_insurance">("deposit");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الملف يجب أن يكون أقل من 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "خطأ",
        description: "نوع الملف غير مدعوم",
        variant: "destructive",
      });
      return;
    }

    setProofFile(file);
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("لم يتم تسجيل الدخول");

      let proofUrl = null;

      // Upload proof if provided
      if (proofFile) {
        const fileExt = proofFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("payment_proofs")
          .upload(fileName, proofFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("payment_proofs")
          .getPublicUrl(fileName);

        proofUrl = publicUrl;
      }

      // Update booking with payment details
      const { error: updateError } = await supabase
        .from("booking_requests")
        .update({
          payment_option: paymentOption,
          payment_proof_url: proofUrl,
          payment_status: proofUrl ? "confirmed" : "none",
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      toast({
        title: "تم!",
        description: "تم تسجيل معلومات الدفع بنجاح",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل تسجيل الدفع",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const selectedAmount = paymentOption === "deposit" ? depositAmount : fullInsuranceAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">خيارات الدفع</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{propertyTitle}</h3>
            <p className="text-sm text-muted-foreground">
              اختر طريقة الدفع المناسبة لك
            </p>
          </div>

          <RadioGroup value={paymentOption} onValueChange={(value: any) => setPaymentOption(value)}>
            <div className="space-y-3">
              <div
                className={`flex items-start space-x-2 space-x-reverse border rounded-lg p-4 cursor-pointer transition-all ${
                  paymentOption === "deposit"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setPaymentOption("deposit")}
              >
                <RadioGroupItem value="deposit" id="deposit" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="deposit" className="font-medium cursor-pointer">
                    دفع عربون (20%)
                  </Label>
                  <p className="text-2xl font-bold text-primary">{depositAmount} جنيه</p>
                  <p className="text-xs text-muted-foreground">
                    دفع مقدم للحجز، وسيتم دفع باقي المبلغ لاحقاً
                  </p>
                </div>
              </div>

              <div
                className={`flex items-start space-x-2 space-x-reverse border rounded-lg p-4 cursor-pointer transition-all ${
                  paymentOption === "full_insurance"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setPaymentOption("full_insurance")}
              >
                <RadioGroupItem value="full_insurance" id="full_insurance" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="full_insurance" className="font-medium cursor-pointer">
                    دفع كامل التأمين
                  </Label>
                  <p className="text-2xl font-bold text-primary">{fullInsuranceAmount} جنيه</p>
                  <p className="text-xs text-muted-foreground">
                    دفع كامل مبلغ التأمين مقدماً
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>

          <div className="space-y-2">
            <Label>إثبات الدفع (اختياري)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="proof_upload"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleProofUpload}
                className="hidden"
              />
              <label
                htmlFor="proof_upload"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-secondary"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">
                  {proofFile ? proofFile.name : "رفع صورة إثبات الدفع"}
                </span>
              </label>
              {proofFile && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setProofFile(null)}
                >
                  <FileText className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              يمكنك رفع صورة لإيصال الدفع أو لقطة شاشة للتحويل
            </p>
          </div>

          <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">المبلغ المطلوب</p>
            <p className="text-3xl font-bold">{selectedAmount} جنيه</p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? "جاري المعالجة..." : "تأكيد الدفع"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
