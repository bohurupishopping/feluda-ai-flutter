import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { LoginPage } from "@/components/login/login-page";
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect('/chat');
  }

  return <LoginPage />;
} 