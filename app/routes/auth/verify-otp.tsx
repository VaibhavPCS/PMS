import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useVerifyOTPMutation } from "@/hooks/use-auth";
import { useAuth } from "../../provider/auth-context";
import { toast } from "sonner";
import AuthPanelLayout from "@/components/layout/auth-panel-layout";

const verifyOtpSchema = z.object({
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
});

type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [showOTP, setShowOTP] = useState(false);
  const { forceAuthCheck } = useAuth();

  const { userId, email, type, message } = location.state || {};

  const form = useForm<VerifyOtpFormData>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const { mutate: verifyOTP, isPending } = useVerifyOTPMutation();

  useEffect(() => {
    if (!userId || !email || !type) {
      navigate("/sign-in");
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error("OTP expired");
          navigate("/sign-in");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [userId, email, type, navigate]);

  const handleSubmit = (values: VerifyOtpFormData) => {
    verifyOTP(
      { userId, otp: values.otp, type },
      {
        onSuccess: async (data: any) => {
          toast.success("Verification successful!");

          // Handle both login and registration verification
          if (type === "login" || type === "registration") {
            // Show appropriate message
            if (type === "registration") {
              toast.success("Welcome! Your account is ready.");
            }

            try {
              // Force auth check to update context with HTTP-only cookie
              await forceAuthCheck();

              // Navigate to dashboard after auth context is updated
              navigate("/dashboard");
            } catch (error) {
              console.error("Failed to fetch user info after verification:", error);
              toast.error("Login successful but failed to load user data. Please try refreshing.");
              navigate("/dashboard");
            }
          } else {
            // Fallback for password-reset or other types
            navigate("/sign-in");
          }
        },
        onError: (error: any) => {
          const errorMessage =
            error.response?.data?.message || "Verification failed";
          toast.error(errorMessage);
        },
      }
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!userId || !email || !type) {
    return null;
  }

  return (
    <AuthPanelLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2.5">
          <h1 className="text-2xl font-semibold text-[#1a1a1a]">Verify OTP</h1>
          <p className="text-sm text-gray-500">
            {message || "Please enter the 6-digit code sent to your email to reset your password."}
          </p>
        </div>

        {/* Email Info */}
        <div className="flex flex-col gap-1">
          <p className="text-sm text-[#1a1a1a]">{email}</p>
          <p className="text-xs text-red-600">
            Expires in {formatTime(countdown)} sec
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="flex flex-col gap-4">
              {/* OTP Field */}
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#333333] px-4">6-digit OTP</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showOTP ? "text" : "password"}
                          placeholder="••••••"
                          maxLength={6}
                          className="h-12 bg-[#f2f2f2] border-[0.5px] border-neutral-200 rounded-md px-4 pr-12 text-sm placeholder:text-gray-500"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            field.onChange(value);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOTP(!showOTP)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#4d4d4d] hover:text-[#1a1a1a]"
                        >
                          {showOTP ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Verify OTP Button */}
              <Button
                type="submit"
                disabled={isPending || countdown === 0}
                className="w-full h-10 bg-[#007aff] hover:bg-[#0066cc] text-white font-bold text-[15px] rounded-md px-6 py-2.5 transition-colors"
              >
                {isPending ? "Verifying..." : "Verify OTP"}
              </Button>
            </form>
          </Form>
        </div>

        {/* Bottom Link */}
        <div className="flex items-center justify-center gap-2 text-xs">
          {type === "password-reset" ? (
            <>
              <Link to="/forgot-password" className="text-[#007aff] hover:underline">
                Wrong Password?
              </Link>
            </>
          ) : (
            <>
              <Link to="/sign-in" className="text-[#007aff] hover:underline">
                Back to Sign
              </Link>
            </>
          )}
        </div>
      </div>
    </AuthPanelLayout>
  );
};

export default VerifyOtp;
