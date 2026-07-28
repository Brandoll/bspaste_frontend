'use client';

import { useEffect } from 'react';
import { MainEditor } from '@/components/editor/MainEditor';
import { AppShell } from '@/components/layout/AppShell';
import { RightPanel } from '@/components/layout/RightPanel';
import { usePasteStore } from '@/stores/usePasteStore';

export function CreateWorkspace({ defaultLive = false }: { defaultLive?: boolean }) {
  const resetPaste = usePasteStore((state) => state.resetPaste);

  useEffect(() => resetPaste(), [resetPaste]);

  return (
    <AppShell canvasClassName="lg:h-[calc(100vh-1rem)]">
      <main className="flex min-h-[calc(100vh-4rem)] flex-col lg:h-full lg:min-h-0 xl:flex-row">
        <MainEditor />
        <RightPanel defaultLive={defaultLive} />
      </main>
    </AppShell>
  );
}
