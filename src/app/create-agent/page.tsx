'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateAgentRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to register page
    window.location.href = '/register';
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="text-white">Redirecting...</div>
    </div>
  );
}
