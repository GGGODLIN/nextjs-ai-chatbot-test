'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { chatModels } from '@/lib/ai/models';
import { cn } from '@/lib/utils';
import { useModelStore } from '@/lib/store/modelStore';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

export function MultiModelSelector({
    className,
}: React.ComponentProps<typeof Button>) {
    const {
        selectedModelIds,
        toggleModelSelection,
        setSelectedModelIds
    } = useModelStore();

    const [open, setOpen] = useState(false);

    // 獲取已選模型的名稱
    const selectedModelsText = selectedModelIds.length > 0
        ? selectedModelIds.length === 1
            ? chatModels.find(model => model.id === selectedModelIds[0])?.name || '已選擇 1 個模型'
            : `已選擇 ${selectedModelIds.length} 個模型`
        : '選擇模型';

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
                    const { id, disabled, disabledReason } = chatModel;
                    const isSelected = selectedModelIds.includes(id);

                    // 為禁用的模型創建帶有提示的菜單項
                    if (disabled) {
                        return (
                            <TooltipProvider key={id}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="px-2 py-1.5 cursor-not-allowed opacity-50">
                                            <div className="gap-4 group/item flex flex-row justify-between items-center">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <div>{chatModel.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {chatModel.description}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="text-foreground dark:text-foreground">
                                                        <CheckCircleFillIcon />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{disabledReason || '此模型暫時不可用'}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    }

                    // 正常的可選模型
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