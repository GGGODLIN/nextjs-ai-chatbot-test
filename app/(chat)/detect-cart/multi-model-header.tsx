'use client';

import { MultiModelSelector } from '@/components/multi-model-selector';

export function MultiModelHeader({
    selectedModelIds,
}: {
    selectedModelIds: string[];
}) {
    return (
        <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
            <div className="flex flex-col gap-2">
                <MultiModelSelector selectedModelIds={selectedModelIds} />
            </div>
        </header>
    );
} 