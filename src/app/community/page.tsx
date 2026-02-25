'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to unified messages page
export default function CommunityRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/messages?tab=community');
  }, [router]);
  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Redirecting to messages...</div>
    </div>
  );
}
