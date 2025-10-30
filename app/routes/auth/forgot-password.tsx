import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router';
import { useForgotPasswordMutation } from '@/hooks/use-auth';
import { toast } from 'sonner';
import AuthPanelLayout from '@/components/layout/auth-panel-layout';

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const { mutate, isPending } = useForgotPasswordMutation();

  const handleOnSubmit = (values: ForgotPasswordFormData) => {
    mutate(values, {
      onSuccess: (data: any) => {
        toast.success("Reset Code Sent", {
          description: "Please check your email for a 6-digit code to reset your password.",
        });

        form.reset();

        // Navigate to OTP verification with reset context
        navigate("/verify-otp", {
          state: {
            userId: data.userId,
            email: values.email,
            type: 'password-reset',
            message: 'Please enter the 6-digit code sent to your email to reset your password.'
          }
        });
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || "An error occurred";
        if (error.response?.status === 404) {
          toast.error("Account doesn't exist", {
            description: "No account found with this email address.",
          });
        } else {
          toast.error(errorMessage);
        }
      },
    });
  };

  return (
    <AuthPanelLayout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2.5">
          <h1 className="text-2xl font-semibold text-[#1a1a1a]">Forgot Password ?</h1>
          <p className="text-sm text-gray-500">
            Enter your email address and we'll send you a code to reset your password!
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleOnSubmit)} noValidate className="flex flex-col gap-4">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({field}) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#333333] px-4">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter Email"
                        className="h-12 bg-[#f2f2f2] border-[0.5px] border-neutral-200 rounded-md px-4 text-sm placeholder:text-gray-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Send Reset Code Button */}
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-10 bg-[#007aff] hover:bg-[#0066cc] text-white font-bold text-[15px] rounded-md px-6 py-2.5 transition-colors"
              >
                {isPending ? 'Sending...' : 'Send Reset Code'}
              </Button>
            </form>
          </Form>
        </div>

        {/* Back to Sign In Link */}
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

export default ForgotPassword;
