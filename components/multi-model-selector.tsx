'use client';

import { startTransition, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { chatModels } from '@/lib/ai/models';
import { cn } from '@/lib/utils';
import { saveDetectCartModelsAsCookie } from '@/app/(chat)/detect-cart/actions';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

export function MultiModelSelector({
    selectedModelIds,
    className,
}: {
    selectedModelIds: string[];
} & React.ComponentProps<typeof Button>) {
    const [open, setOpen] = useState(false);
    const [optimisticModelIds, setOptimisticModelIds] = useState<string[]>(selectedModelIds);

    // 當 selectedModelIds 變化時更新 optimisticModelIds
    useEffect(() => {
        setOptimisticModelIds(selectedModelIds);
    }, [selectedModelIds]);

    // 獲取已選模型的名稱
    const selectedModelsText = optimisticModelIds.length > 0
        ? optimisticModelIds.length === 1
            ? chatModels.find(model => model.id === optimisticModelIds[0])?.name || '已選擇 1 個模型'
            : `已選擇 ${optimisticModelIds.length} 個模型`
        : '選擇模型';

    // 切換模型選擇狀態
    const toggleModelSelection = (modelId: string) => {
        const newSelection = optimisticModelIds.includes(modelId)
            ? optimisticModelIds.filter(id => id !== modelId)
            : [...optimisticModelIds, modelId];

        setOptimisticModelIds(newSelection);

        startTransition(() => {
            saveDetectCartModelsAsCookie(newSelection);
        });
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger
                asChild
                className={cn(
                    'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
                    className,
                )}
            >
                <Button variant="outline" className="md:px-2 md:h-[34px]">
                    {selectedModelsText}
                    <ChevronDownIcon />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[300px]">
                {chatModels.map((chatModel) => {
                    const { id } = chatModel;
                    const isSelected = optimisticModelIds.includes(id);

                    return (
                        <DropdownMenuItem
                            key={id}
                            onSelect={(e) => {
                                e.preventDefault(); // 防止選單關閉
                                toggleModelSelection(id);
                            }}
                            className="gap-4 group/item flex flex-row justify-between items-center"
                            data-active={isSelected}
                        >
                            <div className="flex flex-col gap-1 items-start">
                                <div>{chatModel.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {chatModel.description}
                                </div>
                            </div>

                            <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                                <CheckCircleFillIcon />
                            </div>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
} 