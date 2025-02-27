import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { myProvider } from '@/lib/ai/models';

export async function POST(req: Request) {
    try {
        const { prompt, model } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: '缺少 prompt 參數' },
                { status: 400 }
            );
        }

        const { text: response } = await generateText({
            model: myProvider.languageModel(model || 'chat-model-large'),
            system: '你是一位專業的 HTML 分析專家，擅長分析網頁結構並找出特定元素。請分析提供的 HTML 代碼，找出購物車小計(subtotal)元素，並給出準確的 querySelector。請盡量給出準確的結果，而不是基於html結構的選擇器',
            prompt: prompt
        });

        return NextResponse.json({ response });
    } catch (error) {
        console.error('分析 HTML 時出錯:', error);

        // 檢查是否為配額耗盡錯誤
        if (error && typeof error === 'object' && 'data' in error) {
            const errorData = (error as any).data;
            if (errorData && errorData.error) {
                return NextResponse.json(
                    { error: errorData.error },
                    { status: errorData.error.code || 500 }
                );
            }
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : '未知錯誤' },
            { status: 500 }
        );
    }
} 