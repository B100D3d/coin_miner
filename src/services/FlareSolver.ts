import axios from "axios"

const flareUrl = "http://localhost:8191/v1"
const flareSession = "MinerSession"

interface FlareSolution {
    url: string
    status: number
    headers: Record<string, string>
    response: string
}

export const createSession = () =>
    axios.post(flareUrl, {
        cmd: "sessions.create",
        session: flareSession,
    })

export const get = async (url: string): Promise<FlareSolution> => {
    const result = await axios.post(flareUrl, {
        cmd: "request.get",
        session: flareSession,
        url,
    })
    return result.data.solution
}
