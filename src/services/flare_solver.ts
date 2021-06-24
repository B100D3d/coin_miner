import rp from "request-promise"

const flareUrl = "http://localhost:8191/v1"
const flareSession = "MinerSession"

interface FlareSolution {
    url: string
    status: number
    headers: Record<string, string>
    response: string
}

export const createSession = () =>
    rp({
        method: "POST",
        json: true,
        uri: flareUrl,
        body: {
            cmd: "sessions.create",
            session: flareSession,
        },
    })

export const get = async (url: string): Promise<FlareSolution> => {
    const result = await rp({
        method: "POST",
        json: true,
        uri: flareUrl,
        body: {
            cmd: "request.get",
            session: flareSession,
            url,
        },
    })
    return result.solution
}
