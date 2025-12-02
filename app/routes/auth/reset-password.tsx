import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router";
import { useResetPasswordMutation } from "@/hooks/use-auth";
import { toast } from "sonner";
import AuthPanelLayout from "@/components/layout/auth-panel-layout";
import { resetPasswordSchema } from "@/lib/schema";
import type { z } from "zod";

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, resetToken } = location.state || {};

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { mutate, isPending } = useResetPasswordMutation();

  React.useEffect(() => {
    if (!userId || !resetToken) {
      toast.error("Invalid access");
      navigate("/forgot-password");
    }
  }, [userId, resetToken, navigate]);

  const handleOnSubmit = (values: ResetPasswordFormData) => {
    mutate(
      {
        userId,
        resetToken,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          toast.success("Password Reset Successful", {
            description: "Your password has been updated. You can now log in with your new password.",
          });

          form.reset();
          navigate("/sign-in");
        },
        onError: (error: any) => {
          const errorMessage = error.response?.data?.message || "Failed to reset password";
          toast.error(errorMessage);
        },
      }
    );
  };

  if (!userId || !resetToken) {
    return null;
  }

  return (
    <AuthPanelLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-2xl font-semibold text-[#1a1a1a]">Reset Password</h1>
          <p className="text-sm text-gray-500">Enter your new password below.</p>
        </div>

        <div className="flex flex-col gap-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleOnSubmit)} noValidate className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#333333] px-4">New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        className="h-12 bg-[#f2f2f2] border-[0.5px] border-neutral-200 rounded-md px-4 text-sm placeholder:text-gray-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#333333] px-4">Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        className="h-12 bg-[#f2f2f2] border-[0.5px] border-neutral-200 rounded-md px-4 text-sm placeholder:text-gray-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-10 bg-[#007aff] hover:bg-[#0066cc] text-white font-bold text-[15px] rounded-md px-6 py-2.5 transition-colors"
              >
                {isPending ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          </Form>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="text-[#1a1a1a]">Remember your password?</span>
          <Link to="/sign-in" className="text-[#007aff] hover:underline">
            Back to Sign
          </Link>
        </div>
      </div>
    </AuthPanelLayout>
  );
};

export default ResetPassword;
