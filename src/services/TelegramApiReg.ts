import axios from "axios"
import crypto from "crypto"
import HttpsProxyAgent from "https-proxy-agent"
import { parse as parseHTML } from "node-html-parser"
import { getProxy } from "../utils/proxy"

interface TelegramApi {
    apiId: number
    apiHash: string
}

const TGClient = axios.create({
    baseURL: "https://my.telegram.org",
})

export default class TelegramApiReg {
    /**
     * sending request to get telegram code (password)
     * @param phone phone number
     * @return random hash for session
     */
    static async sendCode(phone: string): Promise<string> {
        try {
            const proxy = getProxy()
            const res = await TGClient.get("/auth/send_password", {
                params: {
                    phone,
                },
                withCredentials: true,
                httpsAgent: new (HttpsProxyAgent as any)(proxy),
            })
            return res.data.random_hash
        } catch (e) {
            console.error("Can't send telegram code: ", e)
            throw e
        }
    }

    /**
     * sign in to telegram account and returns cookies
     * @param phone phone number
     * @param code telegram code (password)
     * @param hash random hash
     * @param proxy axios proxy
     * @returns cookies
     */
    static async login(
        phone: string,
        code: string,
        hash: string,
        proxy = getProxy()
    ): Promise<Array<string>> {
        const loginConfig = {
            params: {
                phone,
                random_hash: hash,
                password: code,
            },
            withCredentials: true,
            httpsAgent: new (HttpsProxyAgent as any)(proxy),
        }
        const loginRes = await TGClient.get(`/auth/login`, loginConfig)
        const setCookieArray = loginRes.headers["set-cookie"] || []
        const cookies = setCookieArray.map(
            (cookie) => cookie.split(";")?.[0] || ""
        )
        return cookies.join("; ")
    }

    /**
     * returns telegram api data if already created
     * @param cookies
     * @param proxy axios proxy
     * @returns telegram api data
     */
    static async getApi(
        cookies: Array<string>,
        proxy = getProxy()
    ): Promise<TelegramApi | undefined> {
        const apiListRes = await TGClient.get("/apps", {
            headers: { Cookie: cookies },
            withCredentials: true,
            httpsAgent: new (HttpsProxyAgent as any)(proxy),
        })
        const apiListHTML = parseHTML(apiListRes.data)
        const form = apiListHTML.querySelector("#app_edit_form")

        if (!form) return

        const formControls = form.querySelectorAll(".form-control")
        const apiId = +formControls[0].querySelector("strong").textContent
        const apiHash = formControls[1].textContent
        return { apiId, apiHash }
    }

    /**
     * creates telegram api (if it doesn't exists) and returns api telegram data
     * @param phone phone number
     * @param code telegram code (password)
     * @param randomHash random hash
     */
    static async createApi(
        phone: string,
        code: string,
        randomHash: string
    ): Promise<TelegramApi | null> {
        try {
            const proxy = getProxy()
            const cookies = await TelegramApiReg.login(
                phone,
                code,
                randomHash,
                proxy
            )
            const existedApiData = await TelegramApiReg.getApi(cookies, proxy)

            if (existedApiData) return existedApiData

            const appTitle = crypto.randomBytes(10).toString("hex")
            const createAppConfig = {
                params: {
                    hash: randomHash,
                    app_title: appTitle,
                    app_shortname: appTitle,
                    app_url: "",
                    app_platform: "android",
                    app_desc: "",
                },
                headers: { Cookie: cookies },
                withCredentials: true,
                httpsAgent: new (HttpsProxyAgent as any)(proxy),
            }
            await TGClient.get("/apps/create", createAppConfig)
            return TelegramApiReg.getApi(cookies, proxy)
        } catch (e) {
            console.error("Can't create telegram api: ", e)
            return null
        }
    }
}
