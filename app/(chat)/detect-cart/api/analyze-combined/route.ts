import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { myProvider } from '@/lib/ai/models';
import { saveTokenUsage } from '@/lib/db/queries';
import { auth } from '@/app/(auth)/auth';

export async function POST(req: Request) {
    try {
        const { answers, modelId = 'chat-model-gemini', html } = await req.json();

        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return NextResponse.json(
                { error: '缺少有效的 answers 參數' },
                { status: 400 }
            );
        }

        // 構建 prompt
        const prompt = `我有多個 AI 模型對同一個問題的回答，請幫我綜合分析這些回答，找出最合理的解決方案。
問題是：分析 Shopify 購物車 HTML，判斷 subtotal element 有可能是哪個，給出 querySelector。

以下是各個模型的回答：
${answers.map(a => `模型 ${a.modelName}：${a.answer || '無法解析出有效答案'}`).join('\n\n')}

以下是 HTML 內容：
${html}

請綜合分析這些回答，給出：
1. 最可能正確的 querySelector 選擇器
2. 為什麼你認為這個選擇器是最合適的
3. 如果有多個可能的選擇器，請列出並說明各自的優缺點

請在回答的最後加上一行純文字：output:document.querySelector('你認為最合適的選擇器')`;

        // 獲取當前用戶 ID（如果已登入）
        const session = await auth();
        const userId = session?.user?.id;

        // 使用指定的 AI 模型進行綜合分析
        const { text: response, ...rest } = await generateText({
            model: myProvider.languageModel(modelId),
            system: `你是一位專業的 HTML 分析專家，擅長分析網頁結構並找出特定元素。你的任務是綜合分析多個 AI 模型對同一問題的回答，找出最合理的解決方案。`,
            prompt: prompt
        });

        // 儲存 token 使用量
        if (rest?.usage?.totalTokens) {
            try {
                await saveTokenUsage({
                    modelId,
                    totalTokens: rest.usage.totalTokens,
                    timestamp: Date.now(),
                    userId
                });
                console.log('Token 使用量已儲存', modelId, rest.usage.totalTokens);
            } catch (error) {
                console.error('儲存 Token 使用量時出錯:', error);
            }
        }

        return NextResponse.json({ ...rest, response });
    } catch (error) {
        console.error('綜合分析時出錯:', error);

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