export const PROD = process.env.PRODUCTION === "true"
export const PORT = process.env.PORT

export const origin = PROD
    ? ["https://miner.devourer.ru"]
    : ["http://localhost:8080"]
