'use client'

import { useState } from 'react'

interface DetectCartFormProps {
    onSubmit: (formData: FormData) => Promise<any>
}

export function DetectCartForm({ onSubmit }: DetectCartFormProps) {
    const [result, setResult] = useState<any>(null)
    console.log('result:', result)

    async function handleSubmit(formData: FormData) {
        const response = await onSubmit(formData)
        setResult(response)
        //打開一個新視窗，把html貼上
        const newWindow = window.open('', '_blank')
        if (newWindow) {
            newWindow.document.write(response.html)
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
                        className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
                    >
                        送出
                    </button>
                </div>
            </form>


        </>
    )
} 