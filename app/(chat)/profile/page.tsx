import { auth } from '@/app/(auth)/auth';
import { getUser } from '@/lib/db/queries';
import { Metadata } from 'next';
import Image from 'next/image';
import { TokenUsageChart } from './token-usage-chart';

export const metadata: Metadata = {
    title: '個人資料',
    description: '查看和管理您的個人資料',
};

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user?.email) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold">未登入</h1>
                <p className="mt-2">請先登入以查看您的個人資料</p>
            </div>
        );
    }

    const users = await getUser(session.user.email);
    const user = users[0];

    return (
        <div className="container max-w-4xl py-8 mx-auto">
            <h1 className="text-3xl font-bold mb-8">個人資料</h1>

            <div className="bg-card rounded-lg shadow-md p-6">
                <div className="flex items-center space-x-6 mb-6">
                    <div className="relative w-24 h-24">
                        <Image
                            src={`https://avatar.vercel.sh/${user.email}`}
                            alt={user.email || '用戶頭像'}
                            fill
                            className="rounded-full object-cover"
                        />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold">{user.email}</h2>
                        <p className="text-muted-foreground">用戶 ID: {user.id}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="border-t pt-6">
                        <h3 className="text-xl font-medium mb-4">帳號資訊</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">電子郵件</p>
                                <p>{user.email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h3 className="text-xl font-medium mb-4">API 使用統計</h3>
                        <TokenUsageChart />
                    </div>
                </div>
            </div>
        </div>
    );
} 