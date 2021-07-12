import axios from "axios"
import crypto from "crypto"
import HttpsProxyAgent from "https-proxy-agent"
import { HTMLElement, parse as parseHTML } from "node-html-parser"
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
     * sign in to telegram account and returns cookies
     * @param phone phone number
     * @param code telegram code (password)
     * @param hash random hash
     * @param proxy axios proxy
     * @returns cookies
     */
    private static async login(
        phone: string,
        code: string,
        hash: string,
        proxy = getProxy()
    ): Promise<string> {
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
     * returns parsed /apps page HTML
     */
    private static async getAppsHTML(
        cookies: string,
        proxy = getProxy()
    ): Promise<HTMLElement> {
        const apiListRes = await TGClient.get("/apps", {
            headers: { Cookie: cookies },
            withCredentials: true,
            httpsAgent: new (HttpsProxyAgent as any)(proxy),
        })
        return parseHTML(apiListRes.data)
    }

    /**
     * returns telegram api data if already created
     */
    private static async getApi(
        cookies: string,
        proxy = getProxy()
    ): Promise<TelegramApi | undefined> {
        const apiListHTML = await TelegramApiReg.getAppsHTML(cookies, proxy)
        const editForm = apiListHTML.querySelector("#app_edit_form")

        if (!editForm) return

        const formControls = editForm.querySelectorAll(".form-control")
        const apiId = +formControls[0].querySelector("strong").textContent
        const apiHash = formControls[1].textContent
        return { apiId, apiHash }
    }

    /**
     * returns hidden input hash to create telegram api
     */
    private static async getCreationApiHash(
        cookies: string,
        proxy = getProxy()
    ): Promise<string | undefined> {
        const apiListHTML = await TelegramApiReg.getAppsHTML(cookies, proxy)
        const createForm = apiListHTML.querySelector("#app_create_form")
        return createForm?.querySelector("> input")?.getAttribute("value")
    }

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
            const hash = await TelegramApiReg.getCreationApiHash(cookies, proxy)
            if (!hash) return

            const hex = crypto.randomBytes(10).toString("hex")
            const appTitle = `app${hex}`
            const createAppConfig = {
                params: {
                    hash,
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
