import { cn } from '@/lib/utils';
import { MobileHeader } from './MobileHeader';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
  canvasClassName?: string;
}

export function AppShell({ children, canvasClassName }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-foreground dark:bg-[#090b10] lg:flex lg:h-screen lg:overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <div
          className={cn(
            'min-w-0 flex-1 bg-background lg:m-2 lg:ml-0 lg:min-h-0 lg:overflow-hidden lg:rounded-[1.15rem] lg:border lg:shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
            canvasClassName,
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
