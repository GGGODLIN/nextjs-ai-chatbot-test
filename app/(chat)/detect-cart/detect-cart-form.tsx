'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { chatModels } from '@/lib/ai/models'

interface DetectCartFormProps {
    onSubmit: (formData: FormData) => Promise<any>
    selectedModelId: string
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

export function DetectCartForm({ onSubmit, selectedModelId }: DetectCartFormProps) {
    const [result, setResult] = useState<CartResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [aiResponse, setAiResponse] = useState<string | null>(null)
    const [currentModelId, setCurrentModelId] = useState(selectedModelId)
    const router = useRouter()

    // 當 selectedModelId 變化時更新 currentModelId
    useEffect(() => {
        setCurrentModelId(selectedModelId)
    }, [selectedModelId])

    async function handleSubmit(formData: FormData) {
        try {
            setLoading(true)
            setAiResponse(null)
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
${result.html}
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

                        // // 處理特定錯誤類型
                        // if (response.status === 429) {
                        //     errorMessage = `資源配額已耗盡 (${errorData.error.status}): ${errorData.error.message}`
                        // }
                    }
                }

                throw new Error(errorMessage)
            }

            const data = await response.json()
            setAiResponse(data.response)
        } catch (error) {
            console.error('分析 HTML 時出錯:', error)
            setAiResponse(`分析時出錯: ${error instanceof Error ? error.message : '未知錯誤'}`)
        } finally {
            setAnalyzing(false)
        }
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
    const currentModelName = chatModels.find(model => model.id === currentModelId)?.name || currentModelId

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
                                <div className="flex justify-center gap-2">
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
                                    使用 {currentModelName} 分析中...
                                </div>
                            )}

                            {aiResponse && (
                                <div className="p-4 bg-blue-50 text-blue-800 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-medium">AI 分析結果:</h4>
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
                                    <div>使用的 AI 模型: {currentModelName}</div>
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