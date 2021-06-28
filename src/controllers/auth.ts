import { RequestHandler } from "express"
import { PROD } from "../config"

const SIXTY_DAYS_IN_MILLISECOND = 1000 * 60 * 60 * 24 * 60
const cookieOptions = {
    httpOnly: true,
    maxAge: SIXTY_DAYS_IN_MILLISECOND,
    secure: PROD,
}

export const login: RequestHandler = (req, res) => {
    const password = req.body.password

    if (password !== process.env.SERVER_PASSWORD) {
        return res.status(403).json({
            message: "Wrong password",
        })
    }

    res.cookie("X-Refresh-Token", password, cookieOptions).status(200).json({
        password,
    })
}

export const auth: RequestHandler = (req, res) => {
    const password = req.cookies["X-Refresh-Token"]

    if (password !== process.env.SERVER_PASSWORD) {
        res.clearCookie("X-Refresh-Token").status(403).json({
            message: "Unauthorized",
        })
        return
    }

    res.cookie("X-Refresh-Token", password, cookieOptions).status(200).json({
        password,
    })
}
