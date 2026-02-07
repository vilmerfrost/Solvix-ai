import { SystemStatus } from '@/components/SystemStatus';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-sans bg-stone-50 text-stone-900 min-h-screen">
      {children}
    </div>
  );
}
