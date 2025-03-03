'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { chatModels } from '@/lib/ai/models'

interface DetectCartFormProps {
    onSubmit: (formData: FormData) => Promise<any>
    selectedModelId: string
    selectedModelIds?: string[]
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
}

export function DetectCartForm({ onSubmit, selectedModelId, selectedModelIds = [] }: DetectCartFormProps) {
    const [result, setResult] = useState<CartResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [aiResponse, setAiResponse] = useState<string | null>(null)
    const [currentModelId, setCurrentModelId] = useState(selectedModelId)
    const [localModelIds, setLocalModelIds] = useState<string[]>(selectedModelIds)
    const [modelResults, setModelResults] = useState<ModelAnalysisResult[]>([])
    const router = useRouter()

    // 當 selectedModelId 變化時更新 currentModelId
    useEffect(() => {
        setCurrentModelId(selectedModelId)
    }, [selectedModelId])

    // 當 selectedModelIds 變化時更新 localModelIds
    useEffect(() => {
        setLocalModelIds(selectedModelIds)
    }, [selectedModelIds])

    // 獲取選擇的多個模型
    useEffect(() => {
        // 如果沒有提供 selectedModelIds，則嘗試從 localStorage 獲取
        if (selectedModelIds.length === 0) {
            try {
                const storedModels = localStorage.getItem('detect-cart-models')
                if (storedModels) {
                    const parsedModels = JSON.parse(storedModels)
                    setLocalModelIds(parsedModels)
                } else {
                    // 如果沒有存儲的模型，則使用當前模型
                    setLocalModelIds([currentModelId])
                }
            } catch (error) {
                console.error('獲取選擇的模型時出錯:', error)
                setLocalModelIds([currentModelId])
            }
        }
    }, [currentModelId, selectedModelIds])

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

    async function analyzeHtmlWithAI() {
        if (!result?.html) return

        const html = simplifyHtml(result.html);

        try {
            setAnalyzing(true)
            setAiResponse(null)

            const prompt = `分析以下 Shopify 購物車 HTML，判斷 subtotal element 有可能是哪個，給出 querySelector：

\`\`\`html
${html}
\`\`\``

            const response = await fetch('/detect-cart/api/analyze-html', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt,
                    model: currentModelId
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
            setAiResponse(data.response)

            // 添加到模型結果中，刪除所有舊資料，只保留最新結果
            const modelName = chatModels.find(model => model.id === currentModelId)?.name || currentModelId
            setModelResults([
                {
                    modelId: currentModelId,
                    modelName,
                    response: data.response,
                    timestamp: Date.now()
                }
            ])
        } catch (error) {
            console.error('分析 HTML 時出錯:', error)
            setAiResponse(`分析時出錯: ${error instanceof Error ? error.message : '未知錯誤'}`)

            // 添加錯誤到模型結果中
            const modelName = chatModels.find(model => model.id === currentModelId)?.name || currentModelId
            setModelResults(prev => [
                ...prev.filter(r => r.modelId !== currentModelId), // 移除相同模型的舊結果
                {
                    modelId: currentModelId,
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
        if (!result?.html || localModelIds.length === 0) return

        const html = simplifyHtml(result.html);

        setAnalyzing(true)
        setAiResponse(null)

        const prompt = `分析以下 Shopify 購物車 HTML，判斷 subtotal element 有可能是哪個，給出 querySelector：

\`\`\`html
${html}
\`\`\``

        // 創建一個新的結果數組，保留不在當前選擇中的模型結果
        const newResults = modelResults.filter(r => !localModelIds.includes(r.modelId))
        setModelResults(newResults)

        // 為每個選擇的模型創建一個分析請求
        const analysisPromises = localModelIds.map(async (modelId) => {
            try {
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
                const modelName = chatModels.find(model => model.id === modelId)?.name || modelId

                return {
                    modelId,
                    modelName,
                    response: data.response,
                    timestamp: Date.now()
                }
            } catch (error) {
                console.error(`使用模型 ${modelId} 分析時出錯:`, error)
                const modelName = chatModels.find(model => model.id === modelId)?.name || modelId

                return {
                    modelId,
                    modelName,
                    response: '',
                    error: error instanceof Error ? error.message : '未知錯誤',
                    timestamp: Date.now()
                }
            }
        })

        // 等待所有請求完成
        const results = await Promise.all(analysisPromises)

        // 更新結果
        setModelResults(prev => [...prev, ...results])
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
            newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${result.storeName || '購物車'} HTML 預覽</title>
                    <style>
                        body {
                            font-family: monospace;
                            white-space: pre-wrap;
                            padding: 20px;
                        }
                        .toolbar {
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            background: #f0f0f0;
                            padding: 10px;
                            border-bottom: 1px solid #ddd;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }
                        .content {
                            margin-top: 50px;
                        }
                    </style>
                </head>
                <body>
                    <div class="toolbar">
                        <h3>${result.storeName || '購物車'} HTML 內容</h3>
                        <button onclick="document.execCommand('selectAll'); document.execCommand('copy');">複製全部</button>
                    </div>
                    <div class="content">
                        ${result.html.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                    </div>
                </body>
                </html>
            `)
            newWindow.document.close()
        } else {
            alert('無法打開新視窗，請檢查您的瀏覽器設置。')
        }
    }

    // 獲取當前模型的名稱
    const currentModelName = chatModels.find(model => model.id === currentModelId)?.name || currentModelId

    // 獲取選擇的模型數量
    const selectedModelsCount = localModelIds.length

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
                            {modelResults.length > 1 && (
                                <div className="space-y-4">
                                    <h4 className="font-medium">多模型分析結果:</h4>

                                    {modelResults
                                        .sort((a, b) => b.timestamp - a.timestamp) // 按時間戳排序，最新的在前
                                        .map((result, index) => (
                                            <div key={`${result.modelId}-${result.timestamp}`} className="p-4 bg-blue-50 text-blue-800 rounded-md">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h5 className="font-medium">{result.modelName}:</h5>
                                                    {result.response && (
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
                                                    <div className="whitespace-pre-wrap text-sm">{result.response}</div>
                                                )}
                                            </div>
                                        ))
                                    }
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
                                    <div>選擇的模型: {localModelIds.map(id => chatModels.find(m => m.id === id)?.name || id).join(', ')}</div>
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