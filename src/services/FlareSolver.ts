import axios from "axios"
import Queue from "../utils/queue"

const queue = new Queue(100)
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
    const job = Symbol(url)
    await queue.wait(job)
    const result = await axios.post(flareUrl, {
        cmd: "request.get",
        session: flareSession,
        url,
    })
    queue.end(job)
    return result.data.solution
}
