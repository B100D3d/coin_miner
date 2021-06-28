import { RequestHandler } from "express"

export const checkAccess: RequestHandler = (req, res, next): void => {
    const password = req.cookies["X-Refresh-Token"]

    if (password !== process.env.SERVER_PASSWORD) {
        res.status(403).json({
            error: "Unauthorized",
        })
        return
    }

    next()
}
