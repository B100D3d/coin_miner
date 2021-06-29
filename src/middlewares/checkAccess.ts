import { RequestHandler } from "express"

export const checkAccess: RequestHandler = (req, res, next) => {
    const password = req.cookies["X-Refresh-Token"]

    if (password !== process.env.SERVER_PASSWORD) {
        return res.status(403).json({
            message: "Unauthorized",
        })
    }

    next()
}
