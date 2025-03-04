import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getTokenUsageByUser } from '@/lib/db/queries';
import { chatModels } from '@/lib/ai/models';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: '未授權' },
                { status: 401 }
            );
        }

        const userId = session.user.id;
        const tokenUsage = await getTokenUsageByUser(userId);

        // 按模型分組並計算總使用量
        const modelUsage = tokenUsage.reduce((acc, usage) => {
            const modelId = usage.modelId;
            const tokens = parseInt(usage.totalTokens);

            if (!acc[modelId]) {
                acc[modelId] = {
                    totalTokens: 0,
                    count: 0,
                    modelName: chatModels.find(model => model.id === modelId)?.name || modelId
                };
            }

            acc[modelId].totalTokens += tokens;
            acc[modelId].count += 1;

            return acc;
        }, {} as Record<string, { totalTokens: number; count: number; modelName: string }>);

        // 計算總使用量
        const totalTokens = Object.values(modelUsage).reduce((sum, { totalTokens }) => sum + totalTokens, 0);

        return NextResponse.json({
            totalTokens,
            totalCalls: tokenUsage.length,
            modelUsage: Object.entries(modelUsage).map(([modelId, data]) => ({
                modelId,
                modelName: data.modelName,
                totalTokens: data.totalTokens,
                count: data.count,
                averageTokens: Math.round(data.totalTokens / data.count)
            }))
        });
    } catch (error) {
        console.error('獲取 Token 使用量時出錯:', error);

        return NextResponse.json(
            { error: error instanceof Error ? error.message : '未知錯誤' },
            { status: 500 }
        );
    }
} 