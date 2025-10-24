import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router';
import { useForgotPasswordMutation } from '@/hooks/use-auth';
import { toast } from 'sonner';

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
    <div className='min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4'>
      <Card className='max-w-md w-full shadow-xl'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl font-bold'>Forgot Password</CardTitle>
          <CardDescription className='text-sm text-muted-foreground'>
            Enter your email address and we'll send you a code to reset your password.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleOnSubmit)} noValidate className='space-y-4'>
              <FormField 
                control={form.control} 
                name="email" 
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type='email' 
                        placeholder='johndoe@gmail.com' 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} 
              />

              <Button type='submit' className='w-full' disabled={isPending}>
                {isPending ? 'Sending...' : 'Send Reset Code'}
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

export default ForgotPassword;
