'use client';

import { useEffect, useState } from 'react';

interface ModelUsage {
    modelId: string;
    modelName: string;
    totalTokens: number;
    count: number;
    averageTokens: number;
}

interface TokenUsageData {
    totalTokens: number;
    totalCalls: number;
    modelUsage: ModelUsage[];
}

export function TokenUsageChart() {
    const [data, setData] = useState<TokenUsageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortField, setSortField] = useState<keyof ModelUsage>('totalTokens');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        async function fetchTokenUsage() {
            try {
                setLoading(true);
                const response = await fetch('/api/token-usage');

                if (!response.ok) {
                    throw new Error(`API 請求失敗: ${response.status}`);
                }

                const data = await response.json();
                setData(data);
            } catch (err) {
                console.error('獲取 Token 使用量時出錯:', err);
                setError(err instanceof Error ? err.message : '未知錯誤');
            } finally {
                setLoading(false);
            }
        }

        fetchTokenUsage();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 p-4 rounded-md text-red-800">
                <p>載入 Token 使用量時出錯: {error}</p>
            </div>
        );
    }

    if (!data || data.totalCalls === 0) {
        return (
            <div className="bg-muted p-4 rounded-md">
                <p className="text-center text-muted-foreground">尚無 API 使用記錄</p>
            </div>
        );
    }

    // 排序模型使用數據
    const sortedModelUsage = [...data.modelUsage].sort((a, b) => {
        if (sortDirection === 'asc') {
            return a[sortField] > b[sortField] ? 1 : -1;
        } else {
            return a[sortField] < b[sortField] ? 1 : -1;
        }
    });

    // 處理排序點擊
    const handleSort = (field: keyof ModelUsage) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc'); // 默認降序
        }
    };

    // 渲染排序圖標
    const renderSortIcon = (field: keyof ModelUsage) => {
        if (field !== sortField) return <span className="ml-1 text-gray-300">⇅</span>;
        return sortDirection === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
    };

    // 找出最大的 Token 使用量，用於計算百分比
    const maxTokens = Math.max(...data.modelUsage.map(m => m.totalTokens));

    return (
        <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
                <p className="text-lg font-medium">總 Token 使用量: <span className="font-bold">{data.totalTokens.toLocaleString()}</span></p>
                <p className="text-sm text-muted-foreground">API 呼叫次數: {data.totalCalls}</p>
            </div>

            <div className="space-y-4">
                {sortedModelUsage.map((model) => (
                    <div key={model.modelId} className="bg-card p-4 rounded-md border">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">{model.modelName}</h4>
                            <span className="text-sm text-muted-foreground">{model.totalTokens.toLocaleString()} tokens</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5">
                            <div
                                className="bg-primary h-2.5 rounded-full"
                                style={{ width: `${(model.totalTokens / maxTokens) * 100}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>使用次數: {model.count}</span>
                            <span>平均每次: {model.averageTokens.toLocaleString()} tokens</span>
                        </div>
                    </div>
                ))}
            </div>
            {/* 表格 */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-muted">
                            <th
                                className="px-4 py-2 text-left cursor-pointer hover:bg-muted/80"
                                onClick={() => handleSort('modelName')}
                            >
                                模型 {renderSortIcon('modelName')}
                            </th>
                            <th
                                className="px-4 py-2 text-right cursor-pointer hover:bg-muted/80"
                                onClick={() => handleSort('count')}
                            >
                                使用次數 {renderSortIcon('count')}
                            </th>
                            <th
                                className="px-4 py-2 text-right cursor-pointer hover:bg-muted/80"
                                onClick={() => handleSort('totalTokens')}
                            >
                                Token 使用量 {renderSortIcon('totalTokens')}
                            </th>
                            <th
                                className="px-4 py-2 text-right cursor-pointer hover:bg-muted/80"
                                onClick={() => handleSort('averageTokens')}
                            >
                                平均每次使用 {renderSortIcon('averageTokens')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedModelUsage.map((model) => (
                            <tr key={model.modelId} className="border-b border-muted">
                                <td className="px-4 py-2">{model.modelName}</td>
                                <td className="px-4 py-2 text-right">{model.count}</td>
                                <td className="px-4 py-2 text-right">{model.totalTokens.toLocaleString()}</td>
                                <td className="px-4 py-2 text-right">{model.averageTokens.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
} 