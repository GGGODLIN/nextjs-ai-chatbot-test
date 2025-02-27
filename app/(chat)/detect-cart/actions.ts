'use server';

export async function submitShopifyStore(storeName: string) {
    const response = await fetch(`https://${storeName}.myshopify.com/products.json`);
    const products = await response.json();
    const variantId = products?.products?.[0]?.variants?.[0]?.id;
    let cookieKeep = '';

    async function followRedirects(url: string, maxRedirects: number = 5) {
        let currentUrl = url;
        let redirectCount = 0;

        while (redirectCount < maxRedirects) {
            console.log(`第 ${redirectCount + 1} 次請求:`, currentUrl);

            const response = await fetch(currentUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                    'Cookie': cookieKeep
                },
                redirect: 'manual',
            });
            const cookies = response.headers.getSetCookie();
            console.log('收到的 cookies:', cookies);

            if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
                const redirectUrl = response.headers.get('location');
                // 獲取並處理 cookies


                // 處理 cookies array
                if (cookies.length > 0) {
                    // 方法1：只保留 cookie 的名稱和值部分
                    cookieKeep = cookies.map(cookie => {
                        return cookie.split(';')[0];
                    }).join('; ');

                    // 方法2：如果需要保留所有 cookie 屬性
                    // cookieKeep = cookies.join('; ');
                }

                console.log(`第 ${redirectCount + 1} 次重定向到:`, redirectUrl);
                console.log('處理後的 cookies:', cookieKeep);

                if (!redirectUrl) {
                    throw new Error('重定向 URL 不存在');
                }

                currentUrl = redirectUrl.startsWith('http')
                    ? redirectUrl
                    : new URL(redirectUrl, currentUrl).toString();

                redirectCount++;
            } else {
                return {
                    response,
                    redirectCount,
                    finalUrl: currentUrl
                };
            }
        }
        throw new Error(`超過最大重定向次數 (${maxRedirects})`);
    }

    const cartUrl = `http://${storeName}.myshopify.com/cart/${variantId}:3?storefront=true`;
    try {
        const { response, redirectCount, finalUrl } = await followRedirects(cartUrl);
        const finalResponse = await fetch(finalUrl, {
            headers: {
                'Cookie': cookieKeep
            }
        });
        const finalResponseText = await finalResponse.text();

        return {
            success: true,
            message: '商店名稱已提交',
            html: finalResponseText,
            variantId: variantId,
            redirectCount: redirectCount,
            finalUrl: finalUrl
        };
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : '未知錯誤',
            variantId: variantId
        };
    }
}