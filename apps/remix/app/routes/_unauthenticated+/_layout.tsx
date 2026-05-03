import { Outlet } from 'react-router';

import { AuthBackground } from '~/components/general/auth/auth-background';

export default function Layout() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 md:p-12 lg:p-16">
      <AuthBackground />

      <div className="relative w-full">
        <Outlet />
      </div>
    </main>
  );
}
