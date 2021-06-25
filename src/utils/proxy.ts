import { AxiosProxyConfig } from "axios"

const proxyList: Array<AxiosProxyConfig> = []

export const getProxy = (): AxiosProxyConfig | false => {
    if (!proxyList.length) return false
    const proxy = proxyList.shift()
    proxyList.push(proxy)
    return proxy
}
