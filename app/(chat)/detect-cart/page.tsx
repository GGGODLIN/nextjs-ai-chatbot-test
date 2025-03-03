import { type Metadata } from 'next'
import { auth } from '@/app/(auth)/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { DetectCartHeader } from './detect-cart-header'
import { MultiModelHeader } from './multi-model-header'
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models'
import { submitShopifyStore } from './actions'
import { DetectCartForm } from './detect-cart-form'

export const metadata: Metadata = {
    title: 'Detect Cart Subtotal',
    description: 'Upload an image to detect cart subtotal.'
}

export default async function DetectCartPage() {
    const session = await auth()

    if (!session?.user) {
        redirect('/sign-in')
    }

    // 獲取單一模型選擇
    const cookieStore = await cookies();
    const selectedModelId = cookieStore.get('chat-model')?.value || DEFAULT_CHAT_MODEL

    // 獲取多模型選擇
    let selectedModelIds: string[] = []
    try {
        const detectCartModels = cookieStore.get('detect-cart-models')?.value
        if (detectCartModels) {
            selectedModelIds = JSON.parse(detectCartModels)
        }
    } catch (error) {
        console.error('解析多模型選擇時出錯:', error)
    }

    // 如果沒有選擇任何模型，則使用默認模型
    if (selectedModelIds.length === 0) {
        selectedModelIds = [DEFAULT_CHAT_MODEL]
    }

    async function handleSubmit(formData: FormData) {
        'use server'
        const storeName = formData.get('storeName')
        if (typeof storeName === 'string') {
            return await submitShopifyStore(storeName)
        }
    }

    return (
        <div className="flex-1 flex flex-col space-y-4">
            {/* <DetectCartHeader selectedModelId={selectedModelId} /> */}
            <MultiModelHeader selectedModelIds={selectedModelIds} />
            <div className="px-4 md:px-8 lg:px-12">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-bold">購物車小計檢測</h1>
                        <p className="text-muted-foreground">
                            上傳圖片來檢測購物車小計金額
                        </p>
                    </div>
                </div>

                <DetectCartForm
                    onSubmit={handleSubmit}
                    selectedModelId={selectedModelIds[0] || selectedModelId}
                    selectedModelIds={selectedModelIds}
                />

            </div>
        </div>
    )
} 