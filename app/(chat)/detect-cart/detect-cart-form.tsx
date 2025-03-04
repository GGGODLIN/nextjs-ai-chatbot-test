'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { chatModels } from '@/lib/ai/models'
import { useModelStore } from '@/lib/store/modelStore'

interface DetectCartFormProps {
    onSubmit: (formData: FormData) => Promise<any>
}

interface CartResult {
    success: boolean
    message: string
    storeName?: string
    subtotal?: string
    currency?: string
    itemCount?: number
    variantId?: string
    redirectCount?: number
    finalUrl?: string
    html?: string
    aiPrompt?: string
    possibleSelectors?: string[]
}

interface ModelAnalysisResult {
    modelId: string
    modelName: string
    response: string
    error?: string
    timestamp: number
    processing?: boolean
}

// 臨時的 ModelStore 接口，直到我們確認真正的 store 存在
interface ModelStore {
    selectedModelId: string
    selectedModelIds: string[]
    setMaxTokens: (tokens: number) => void
}

const parseAiAnswer = (answer: string) => {
    const regex = /output:\s*(.+)/g;  // 添加 g 標誌進行全局匹配
    const matches = [];
    let match;

    while ((match = regex.exec(answer)) !== null) {
        matches.push(match[1].trim());
    }

    // 返回最後一個匹配結果，如果沒有匹配則返回 null
    return matches.length > 0 ? matches[matches.length - 1] : null;
}

const parseAiAnswerSecondary = (answer: string) => {
    //以document.querySelector為特徵抓取document.querySelector('.cart__total-container .heading.h6:nth-of-type(2)')，抓最後一個
    const regex = /document\.querySelector\('(.+?)'/g;  // 添加 g 標誌，使用非貪婪匹配
    const matches = [];
    let match;

    while ((match = regex.exec(answer)) !== null) {
        matches.push(match[0].trim());
    }

    // 返回最後一個匹配結果，如果沒有匹配則返回 null
    return matches.length > 0 ? matches[matches.length - 1] : null;
}

export function DetectCartForm({ onSubmit }: DetectCartFormProps) {
    const {
        selectedModelId,
        selectedModelIds,
    } = useModelStore();

    const [result, setResult] = useState<CartResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [aiResponse, setAiResponse] = useState<string | null>(null)
    const [modelResults, setModelResults] = useState<ModelAnalysisResult[]>([])
    const [combinedAnalysis, setCombinedAnalysis] = useState<string | null>(null)
    const [analyzingCombined, setAnalyzingCombined] = useState(false)
    const [combinedAnalysisModelId, setCombinedAnalysisModelId] = useState('chat-model-gemini')

    const answers = modelResults.map(result => {
        let answer = parseAiAnswer(result.response)
        if (!answer) {
            answer = parseAiAnswerSecondary(result.response)
        }
        return { modelName: result.modelName, answer }
    })
    console.log('answers', answers)
    const router = useRouter()

    // 簡化 HTML 函數
    function simplifyHtml(html: string): string {
        let simplifiedHtml = html;

        // 提取<body>標籤內的內容
        const bodyMatch = simplifiedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch && bodyMatch[1]) {
            simplifiedHtml = bodyMatch[1].trim();
        }

        // 移除所有<script>標籤內的內容
        simplifiedHtml = simplifiedHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // 移除所有<style>標籤內的內容
        simplifiedHtml = simplifiedHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        // 移除所有<svg>標籤內的內容
        simplifiedHtml = simplifiedHtml.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

        return simplifiedHtml;
    }

    async function handleSubmit(formData: FormData) {
        try {
            setLoading(true)
            setAiResponse(null)
            setModelResults([])
            const response = await onSubmit(formData)
            setResult(response)
        } catch (error) {
            console.error('提交表單時出錯:', error)
            setResult({
                success: false,
                message: error instanceof Error ? error.message : '未知錯誤'
            })
        } finally {
            setLoading(false)
        }
    }

    async function analyzeHtmlWithAI() {
        if (!result?.html) return

        try {
            setAnalyzing(true)
            setAiResponse(null)

            const prompt = `分析以下 Shopify 購物車 HTML，判斷 subtotal element 有可能是哪個，給出 querySelector：

\`\`\`html
${simplifyHtml(result.html)}
\`\`\``

            const response = await fetch('/detect-cart/api/analyze-html', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,
                    model: selectedModelId
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => null)
                let errorMessage = `API 請求失敗: ${response.status}`

                if (errorData && errorData.error) {
                    if (typeof errorData.error === 'string') {
                        errorMessage = errorData.error
                    } else if (errorData.error.message) {
                        errorMessage = errorData.error.message

                        // 處理特定錯誤類型
                        if (response.status === 429) {
                            errorMessage = `資源配額已耗盡 (${errorData.error.status}): ${errorData.error.message}`
                        }
                    }
                }

                throw new Error(errorMessage)
            }

            const data = await response.json()
            console.log('data', selectedModelId, data)
            //將data?.usage?.totalTokens 和selectedModelId 存成一組key-value，準備存進db
            if (data?.usage?.totalTokens) {
                try {
                    await fetch('/detect-cart/api/save-token-usage', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            modelId: selectedModelId,
                            totalTokens: data.usage.totalTokens,
                            timestamp: Date.now()
                        })
                    });
                    console.log('Token 使用量已儲存', selectedModelId, data.usage.totalTokens);
                } catch (error) {
                    console.error('儲存 Token 使用量時出錯:', error);
                }
            }
            setAiResponse(data.response)

            // 添加到模型結果中
            const modelName = chatModels.find(model => model.id === selectedModelId)?.name || selectedModelId
            setModelResults(prev => [
                ...prev.filter(r => r.modelId !== selectedModelId), // 移除相同模型的舊結果
                {
                    modelId: selectedModelId,
                    modelName,
                    response: data.response,
                    timestamp: Date.now()
                }
            ])
        } catch (error) {
            console.error('分析 HTML 時出錯:', error)
            setAiResponse(`分析時出錯: ${error instanceof Error ? error.message : '未知錯誤'}`)

            // 添加錯誤到模型結果中
            const modelName = chatModels.find(model => model.id === selectedModelId)?.name || selectedModelId
            setModelResults(prev => [
                ...prev.filter(r => r.modelId !== selectedModelId), // 移除相同模型的舊結果
                {
                    modelId: selectedModelId,
                    modelName,
                    response: '',
                    error: error instanceof Error ? error.message : '未知錯誤',
                    timestamp: Date.now()
                }
            ])
        } finally {
            setAnalyzing(false)
        }
    }

    // 使用所有選擇的模型分析 HTML
    async function analyzeWithAllModels() {
        if (!result?.html || selectedModelIds.length === 0) return

        setAnalyzing(true)
        setAiResponse(null)

        const prompt = `分析以下 Shopify 購物車 HTML，判斷 subtotal element 有可能是哪個，給出 querySelector：

\`\`\`html
${simplifyHtml(result.html)}
\`\`\``

        // 創建一個新的結果數組，保留不在當前選擇中的模型結果
        const newResults = modelResults.filter(r => !selectedModelIds.includes(r.modelId))
        setModelResults(newResults)

        // 過濾掉禁用的模型
        const enabledModelIds = selectedModelIds.filter(modelId =>
            !chatModels.find(model => model.id === modelId)?.disabled
        )

        // 如果沒有啟用的模型，則提前結束
        if (enabledModelIds.length === 0) {
            setAnalyzing(false)
            return
        }

        // 為禁用的模型添加錯誤信息
        const disabledResults = selectedModelIds
            .filter(modelId => chatModels.find(model => model.id === modelId)?.disabled)
            .map((modelId: string) => {
                const model = chatModels.find(m => m.id === modelId)
                return {
                    modelId,
                    modelName: model?.name || modelId,
                    response: '',
                    error: model?.disabledReason || '此模型暫時不可用',
                    timestamp: Date.now()
                }
            })

        // 立即更新禁用模型的結果
        setModelResults(prev => [...prev, ...disabledResults])

        // 為每個選擇的模型創建一個分析請求，但不等待所有請求完成
        enabledModelIds.forEach(async (modelId: string) => {
            try {
                // 先添加一個"處理中"的結果
                const modelName = chatModels.find(model => model.id === modelId)?.name || modelId
                setModelResults(prev => [
                    ...prev.filter(r => r.modelId !== modelId), // 移除相同模型的舊結果
                    {
                        modelId,
                        modelName,
                        response: '處理中...',
                        processing: true,
                        timestamp: Date.now()
                    }
                ])

                const response = await fetch('/detect-cart/api/analyze-html', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt,
                        model: modelId
                    })
                })

                if (!response.ok) {
                    const errorData = await response.json().catch(() => null)
                    let errorMessage = `API 請求失敗: ${response.status}`

                    if (errorData && errorData.error) {
                        if (typeof errorData.error === 'string') {
                            errorMessage = errorData.error
                        } else if (errorData.error.message) {
                            errorMessage = errorData.error.message

                            if (response.status === 429) {
                                errorMessage = `資源配額已耗盡 (${errorData.error.status}): ${errorData.error.message}`
                            }
                        }
                    }

                    throw new Error(errorMessage)
                }

                const data = await response.json()
                console.log('datas', modelId, data)

                // 儲存 token 使用量
                if (data?.usage?.totalTokens) {
                    try {
                        await fetch('/detect-cart/api/save-token-usage', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                modelId: modelId,
                                totalTokens: data.usage.totalTokens,
                                timestamp: Date.now()
                            })
                        });
                        console.log('Token 使用量已儲存', modelId, data.usage.totalTokens);
                    } catch (error) {
                        console.error('儲存 Token 使用量時出錯:', error);
                    }
                }

                // 更新這個模型的結果
                setModelResults(prev => [
                    ...prev.filter(r => r.modelId !== modelId), // 移除相同模型的舊結果
                    {
                        modelId,
                        modelName,
                        response: data.response,
                        timestamp: Date.now()
                    }
                ])
            } catch (error) {
                console.error(`使用模型 ${modelId} 分析時出錯:`, error)
                const modelName = chatModels.find(model => model.id === modelId)?.name || modelId

                // 更新這個模型的錯誤結果
                setModelResults(prev => [
                    ...prev.filter(r => r.modelId !== modelId), // 移除相同模型的舊結果
                    {
                        modelId,
                        modelName,
                        response: '',
                        error: error instanceof Error ? error.message : '未知錯誤',
                        timestamp: Date.now()
                    }
                ])
            }
        })

        // 所有請求已經啟動，但可能還沒完成
        setAnalyzing(false)
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text)
            .then(() => {
                alert('已複製到剪貼板！')
            })
            .catch(err => {
                console.error('複製到剪貼板失敗:', err)
                alert('複製到剪貼板失敗')
            })
    }

    // 在新視窗中打開 HTML
    function openHtmlInNewWindow() {
        if (!result?.html) return

        const newWindow = window.open('', '_blank')
        if (newWindow) {
            newWindow.document.write(result.html)
            newWindow.document.close()
        } else {
            alert('無法打開新視窗，請檢查您的瀏覽器設置。')
        }
    }

    // 獲取當前模型的名稱
    const currentModelName = chatModels.find(model => model.id === selectedModelId)?.name || selectedModelId

    // 獲取選擇的模型數量
    const selectedModelsCount = selectedModelIds.length

    // 綜合分析函數

    async function analyzeCombined() {
        if (answers.length === 0) return;

        try {
            setAnalyzingCombined(true);
            setCombinedAnalysis(null);

            const response = await fetch('/detect-cart/api/analyze-combined', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    html: simplifyHtml(result.html),
                    answers,
                    modelId: combinedAnalysisModelId
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                let errorMessage = `API 請求失敗: ${response.status}`;

                if (errorData && errorData.error) {
                    if (typeof errorData.error === 'string') {
                        errorMessage = errorData.error;
                    } else if (errorData.error.message) {
                        errorMessage = errorData.error.message;

                        if (response.status === 429) {
                            errorMessage = `資源配額已耗盡 (${errorData.error.status}): ${errorData.error.message}`;
                        }
                    }
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('combined analysis data', data);
            setCombinedAnalysis(data.response);
        } catch (error) {
            console.error('綜合分析時出錯:', error);
            setCombinedAnalysis(`分析時出錯: ${error instanceof Error ? error.message : '未知錯誤'}`);
        } finally {
            setAnalyzingCombined(false);
        }
    }

    return (
        <>
            <form action={handleSubmit} className="mt-6">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        name="storeName"
                        placeholder="輸入商店名稱"
                        className="flex-1 rounded-l-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        required
                    />
                    <span className="bg-muted px-3 py-2 text-sm rounded-r-md border border-input">
                        .myshopify.com
                    </span>
                </div>
                <div className="flex justify-center mt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? '處理中...' : '送出'}
                    </button>
                </div>
            </form>

            {result && (
                <div className="mt-6 p-4 border rounded-md bg-background">
                    <h3 className="font-medium mb-2">結果：</h3>

                    {result.success ? (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-md">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">商店名稱:</span>
                                    <span>{result.storeName}</span>
                                </div>
                            </div>


                            {result.html && (
                                <div className="flex flex-wrap justify-center gap-2">
                                    <button
                                        onClick={analyzeHtmlWithAI}
                                        disabled={analyzing}
                                        className="bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {analyzing ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                AI 分析中...
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <path d="M12 16v-4"></path>
                                                    <path d="M12 8h.01"></path>
                                                </svg>
                                                使用 {currentModelName} 分析 HTML
                                            </>
                                        )}
                                    </button>

                                    {selectedModelsCount > 1 && (
                                        <button
                                            onClick={analyzeWithAllModels}
                                            disabled={analyzing}
                                            className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {analyzing ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    多模型分析中...
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                        <circle cx="9" cy="7" r="4"></circle>
                                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                    </svg>
                                                    使用所有選擇的模型分析 ({selectedModelsCount})
                                                </>
                                            )}
                                        </button>
                                    )}

                                    <button
                                        onClick={openHtmlInNewWindow}
                                        className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                            <polyline points="15 3 21 3 21 9"></polyline>
                                            <line x1="10" y1="14" x2="21" y2="3"></line>
                                        </svg>
                                        在新視窗查看 HTML
                                    </button>
                                </div>
                            )}

                            {analyzing && (
                                <div className="text-center text-sm text-muted-foreground">
                                    {selectedModelsCount > 1 ? '多模型分析中...' : `使用 ${currentModelName} 分析中...`}
                                </div>
                            )}

                            {/* 顯示單一模型分析結果 */}
                            {aiResponse && (
                                <div className="p-4 bg-blue-50 text-blue-800 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-medium">AI 分析結果 ({currentModelName}):</h4>
                                        <button
                                            onClick={() => copyToClipboard(aiResponse)}
                                            className="text-xs bg-blue-200 hover:bg-blue-300 px-2 py-1 rounded"
                                        >
                                            複製
                                        </button>
                                    </div>
                                    <div className="whitespace-pre-wrap text-sm">{aiResponse}</div>
                                </div>
                            )}

                            {/* 顯示多模型分析結果 */}
                            {/* 如果模型結果數量大於1，則顯示多模型分析結果 */}
                            {modelResults.length > 1 && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium">多模型分析結果:</h4>
                                        {!analyzingCombined && modelResults.filter(r => !r.processing && !r.error).length > 1 && (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={combinedAnalysisModelId}
                                                    onChange={(e) => setCombinedAnalysisModelId(e.target.value)}
                                                    className="text-sm border rounded px-2 py-1"
                                                >
                                                    {chatModels
                                                        .filter(model => !model.disabled)
                                                        .map(model => (
                                                            <option key={model.id} value={model.id}>
                                                                {model.name}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                                <button
                                                    onClick={analyzeCombined}
                                                    className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md flex items-center gap-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"></path>
                                                        <line x1="2" y1="20" x2="2" y2="20"></line>
                                                    </svg>
                                                    綜合分析
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {modelResults
                                        .sort((a, b) => a.timestamp - b.timestamp) // 按時間戳排序，最早的在前
                                        .map((result, index) => (
                                            <div key={`${result.modelId}-${result.timestamp}`} className={`p-4 ${result.processing ? 'bg-gray-100' : 'bg-blue-50'} text-blue-800 rounded-md`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <h5 className="font-medium">
                                                        {result.modelName}
                                                        {result.processing && <span className="ml-2 text-gray-500">(處理中...)</span>}
                                                    </h5>
                                                    {result.response && !result.processing && (
                                                        <button
                                                            onClick={() => copyToClipboard(result.response)}
                                                            className="text-xs bg-blue-200 hover:bg-blue-300 px-2 py-1 rounded"
                                                        >
                                                            複製
                                                        </button>
                                                    )}
                                                </div>
                                                {result.error ? (
                                                    <div className="text-red-600 whitespace-pre-wrap text-sm">
                                                        錯誤: {result.error}
                                                    </div>
                                                ) : (
                                                    <div className="whitespace-pre-wrap text-sm">
                                                        {result.processing ? (
                                                            <div className="flex items-center">
                                                                <svg className="animate-spin h-4 w-4 mr-2 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                正在分析中...
                                                            </div>
                                                        ) : (
                                                            result.response
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    }

                                    {/* 綜合分析結果 */}
                                    {(analyzingCombined || combinedAnalysis) && (
                                        <div className="mt-6">
                                            <h4 className="font-medium mb-2">綜合分析結果:</h4>
                                            <div className={`p-4 ${analyzingCombined ? 'bg-gray-100' : 'bg-green-50'} text-green-800 rounded-md`}>
                                                <div className="flex justify-between items-center mb-2">
                                                    <h5 className="font-medium">
                                                        綜合分析 ({chatModels.find(model => model.id === combinedAnalysisModelId)?.name || combinedAnalysisModelId})
                                                        {analyzingCombined && <span className="ml-2 text-gray-500">(處理中...)</span>}
                                                    </h5>
                                                    {combinedAnalysis && !analyzingCombined && (
                                                        <button
                                                            onClick={() => copyToClipboard(combinedAnalysis)}
                                                            className="text-xs bg-green-200 hover:bg-green-300 px-2 py-1 rounded"
                                                        >
                                                            複製
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="whitespace-pre-wrap text-sm">
                                                    {analyzingCombined ? (
                                                        <div className="flex items-center">
                                                            <svg className="animate-spin h-4 w-4 mr-2 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            正在進行綜合分析...
                                                        </div>
                                                    ) : (
                                                        combinedAnalysis
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {result.possibleSelectors && (
                                <div className="p-3 bg-blue-50 text-blue-800 rounded-md">
                                    <p className="font-medium mb-2">可能的選擇器：</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {result.possibleSelectors.map((selector, index) => (
                                            <li key={index}>{selector}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <details className="text-sm">
                                <summary className="cursor-pointer">技術詳情</summary>
                                <div className="p-2 mt-2 bg-muted/50 rounded-md">
                                    <div>變體 ID: {result.variantId}</div>
                                    <div>重定向次數: {result.redirectCount}</div>
                                    <div className="truncate">最終 URL: {result.finalUrl}</div>
                                    <div>HTML 長度: {result.html?.length || 0} 字符</div>
                                    <div>選擇的模型: {selectedModelIds.map((id: string) => chatModels.find(m => m.id === id)?.name || id).join(', ')}</div>
                                </div>
                            </details>
                        </div>
                    ) : (
                        <div className="p-3 bg-red-100 text-red-800 rounded-md">
                            <p className="font-medium">錯誤:</p>
                            <p>{result.message}</p>
                        </div>
                    )}
                </div>
            )}
        </>
    )
} 