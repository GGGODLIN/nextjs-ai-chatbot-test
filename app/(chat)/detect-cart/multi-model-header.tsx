'use client';

import { MultiModelSelector } from '@/components/multi-model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
export function MultiModelHeader({
    selectedModelIds,
}: {
    selectedModelIds: string[];
}) {
    return (
        <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
            <div className="flex flex-row gap-2">
                <SidebarToggle />
                <MultiModelSelector selectedModelIds={selectedModelIds} />
            </div>
        </header>
    );
} 