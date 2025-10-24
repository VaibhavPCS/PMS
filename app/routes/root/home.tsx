import React from 'react'
import type { Route } from "./+types/home";
import { Button } from '@/components/ui/button';
import { Link } from 'react-router';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PMS" },
    { name: "description", content: "Welcome to PMS" },
  ];
}

const Homepage = () => {
  return (
    <div className='w-full h-screen flex items-center justify-center gap-4'>
        <Link to='/sign-in'>
            <Button>Login</Button>
        </Link>
        <Link to='/sign-up'>
            <Button variant='outline'>Sign Up</Button>
        </Link>
    </div>
  )
}

export default Homepage