import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router';
import { useResetPasswordMutation } from '@/hooks/use-auth';
import { toast } from 'sonner';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, resetToken } = location.state || {};

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const { mutate, isPending } = useResetPasswordMutation();

  // Redirect if no reset data provided
  React.useEffect(() => {
    if (!userId || !resetToken) {
      toast.error("Invalid access");
      navigate('/forgot-password');
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
          navigate('/sign-in');
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
    <div className='min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4'>
      <Card className='max-w-md w-full shadow-xl'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>Reset Password</CardTitle>
          <CardDescription className='text-sm text-muted-foreground'>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleOnSubmit)} noValidate className='space-y-4'>
              <FormField 
                control={form.control} 
                name="newPassword" 
                render={({field}) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type='password' 
                        placeholder='Enter new password' 
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
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type='password' 
                        placeholder='Confirm new password' 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />

              <Button type='submit' className='w-full' disabled={isPending}>
                {isPending ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>
          </Form>

          <div className='mt-6 text-center'>
            <div className='text-sm text-muted-foreground'>
              Remember your password? <Link to='/sign-in' className='text-primary'>Sign In</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
