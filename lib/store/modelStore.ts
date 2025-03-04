import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chatModels } from '@/lib/ai/models'

export interface ModelState {
    // 當前選擇的單一模型 ID
    selectedModelId: string
    // 多選模式下選擇的模型 ID 數組
    selectedModelIds: string[]
    // 設置當前選擇的模型
    setSelectedModelId: (modelId: string) => void
    // 切換模型選擇狀態（多選模式）
    toggleModelSelection: (modelId: string) => void
    // 設置多個選擇的模型
    setSelectedModelIds: (modelIds: string[]) => void
}

// 創建 Zustand store
export const useModelStore = create<ModelState>()(
    // 使用 persist 中間件將狀態持久化到 localStorage
    persist(
        (set) => ({
            // 初始狀態
            selectedModelId: 'chat-model-gemini',
            selectedModelIds: ['chat-model-gemini'],

            // 設置當前選擇的模型
            setSelectedModelId: (modelId) =>
                set({ selectedModelId: modelId }),

            // 切換模型選擇狀態（多選模式）
            toggleModelSelection: (modelId) => {
                // 檢查模型是否被禁用
                const model = chatModels.find(m => m.id === modelId)
                if (model?.disabled) {
                    return // 如果模型被禁用，不執行任何操作
                }

                set((state) => {
                    // 檢查模型是否已經被選擇
                    const isSelected = state.selectedModelIds.includes(modelId)

                    if (isSelected) {
                        // 如果已選擇，則從數組中移除
                        // 但確保至少保留一個模型
                        if (state.selectedModelIds.length > 1) {
                            return {
                                selectedModelIds: state.selectedModelIds.filter(id => id !== modelId)
                            }
                        }
                        return state // 如果只有一個模型，不做任何更改
                    } else {
                        // 如果未選擇，則添加到數組中
                        return {
                            selectedModelIds: [...state.selectedModelIds, modelId]
                        }
                    }
                })
            },

            // 設置多個選擇的模型
            setSelectedModelIds: (modelIds) => {
                // 確保至少有一個模型被選擇
                if (modelIds.length === 0) {
                    modelIds = ['chat-model-large'] // 使用默認模型
                }
                set({ selectedModelIds: modelIds })
            },


        }),
        {
            // 持久化配置
            name: 'detect-cart-model-storage',
            // 只持久化這些字段
            partialize: (state) => ({
                selectedModelId: state.selectedModelId,
                selectedModelIds: state.selectedModelIds
            })
        }
    )
) 