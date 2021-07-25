import axios from "axios"
import { serializeError } from "serialize-error"
import Queue from "../utils/queue"
import { stringify } from "../utils"

const queue = new Queue(Number(process.env.FLARE_QUEUE || 100))
const flareUrl = `${process.env.FLARE_URL}/v1`
const flareSession = "MinerSession"

const baseProps = {
    session: flareSession,
    password: process.env.FLARE_PASS,
}

interface FlareSolution {
    url: string
    status: number
    headers: Record<string, string>
    response: string
    userAgent: string
    cookies: Array<{
        name: string
        value: string
    }>
    requestCookies: string
}

export default class FlareSolver {
    private static parseSolution(solution: FlareSolution) {
        const requestCookies = solution.cookies
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join("; ")
        return {
            ...solution,
            requestCookies,
        }
    }

    static async createSession() {
        await axios.post(flareUrl, {
            cmd: "sessions.create",
            ...baseProps,
        })
    }

    static async get(url: string): Promise<FlareSolution> {
        const job = Symbol(url)
        try {
            await queue.wait(job)
            const result = await axios.post(flareUrl, {
                cmd: "request.get",
                url,
                ...baseProps,
            })
            return FlareSolver.parseSolution(result.data.solution)
        } catch (e) {
            const message = e.response?.data?.message
            if (message?.includes("This session does not exist")) {
                await FlareSolver.createSession()
                return FlareSolver.get(url)
            }
            throw new Error(
                `Flare error: ${message} | ${stringify(serializeError(e))}`
            )
        } finally {
            queue.end(job)
        }
    }
}
