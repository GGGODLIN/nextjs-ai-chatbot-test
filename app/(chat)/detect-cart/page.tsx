import { type Metadata } from 'next'
import { auth } from '@/app/(auth)/auth'
import { redirect } from 'next/navigation'
import { MultiModelHeader } from './multi-model-header'
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

    async function handleSubmit(formData: FormData) {
        'use server'
        const storeName = formData.get('storeName')
        if (typeof storeName === 'string') {
            return await submitShopifyStore(storeName)
        }
    }

    return (
        <div className="flex-1 flex flex-col space-y-4">
            <MultiModelHeader />
            <div className="px-4 md:px-8 lg:px-12">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-bold">購物車小計檢測</h1>
                    </div>
                </div>

                <DetectCartForm onSubmit={handleSubmit} />

            </div>
        </div>
    )
} 