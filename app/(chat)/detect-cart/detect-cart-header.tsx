import { ModelSelector } from '@/components/model-selector';

export function DetectCartHeader({
    selectedModelId,
}: {
    selectedModelId: string;
}) {
    return (
        <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
            <div className="flex flex-col gap-2">
                <ModelSelector selectedModelId={selectedModelId} />
            </div>
        </header>
    );
} 