import axios from "axios"
import Queue from "../utils/queue"

const queue = new Queue(100)
const flareUrl = `${process.env.FLARE_URL}/v1`
const flareSession = "MinerSession"

interface FlareSolution {
    url: string
    status: number
    headers: Record<string, string>
    response: string
    userAgent: string
}

export default class FlareSolver {
    static async createSession() {
        const {
            data: { sessions },
        } = await axios.post(flareUrl, {
            cmd: "sessions.list",
        })
        if (sessions?.includes(flareSession)) return
        await axios.post(flareUrl, {
            cmd: "sessions.create",
            session: flareSession,
        })
    }

    static async get(url: string): Promise<FlareSolution> {
        const job = Symbol(url)
        try {
            await queue.wait(job)
            const result = await axios.post(flareUrl, {
                cmd: "request.get",
                session: flareSession,
                url,
            })
            return result.data.solution
        } finally {
            queue.end(job)
        }
    }
}
