import { NextResponse } from 'next/server';
import { saveTokenUsage } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

export async function POST(req: Request) {
    try {
        const { modelId, totalTokens, timestamp } = await req.json();

        if (!modelId || !totalTokens) {
            return NextResponse.json(
                { error: '缺少必要參數' },
                { status: 400 }
            );
        }

        // 獲取當前用戶 ID（如果已登入）
        const session = await auth();
        const userId = session?.user?.id;

        // 儲存 token 使用量
        await saveTokenUsage({
            modelId,
            totalTokens,
            timestamp,
            userId
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('儲存 token 使用量時出錯:', error);

        return NextResponse.json(
            { error: error instanceof Error ? error.message : '未知錯誤' },
            { status: 500 }
        );
    }
} 