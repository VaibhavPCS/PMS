import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const verifyOtpSchema = z.object({
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
});

type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(300); // 5 minutes
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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!userId || !email || !type) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Verify OTP</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {message || "Enter the 6-digit code sent to your email"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">Code sent to:</p>
            <p className="font-medium text-gray-900">{email}</p>
            <p className="text-sm text-red-600 mt-2">
              Expires in: {formatTime(countdown)}
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>6-Digit OTP</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="000000"
                        maxLength={6}
                        className="text-center text-2xl tracking-widest"
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isPending || countdown === 0}
              >
                {isPending ? "Verifying..." : "Verify OTP"}
              </Button>
            </form>
          </Form>

          <div className="text-center mt-4">
            <Link
              to="/sign-in"
              className="text-sm text-blue-600 hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyOtp;
