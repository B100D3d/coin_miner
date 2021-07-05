const proxyList: Array<string> = [
    "http://FCbfCV:cE7WZ0@196.19.9.31:8000",
    "http://ttNkVLRS:63cYXNdr@2.56.139.241:46135",
]

export const getProxy = (): string => {
    if (!proxyList.length) return ""
    const proxy = proxyList.shift()
    proxyList.push(proxy)
    return proxy
}
