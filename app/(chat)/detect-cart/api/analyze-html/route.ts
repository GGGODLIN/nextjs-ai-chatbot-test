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

        const { text: response, ...rest } = await generateText({
            model: myProvider.languageModel(model || 'chat-model-gemini'),
            system: `你是一位專業的 HTML 分析專家，擅長分析網頁結構並找出特定元素。請分析提供的 HTML 代碼，找出購物車小計(subtotal)顯示金額的元素，並給出準確的 querySelector。請盡量給出準確的結果，而不是基於html結構的選擇器。請保證選擇器是唯一的，不會選到其他元素。
            在回答的最後加上一段純文字output:document.querySelector('')，將你判斷的選擇器放在空字串裡面。
            `,
            prompt: prompt
        });

        console.log('rest', rest)

        return NextResponse.json({ ...rest, response });
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