import Logger from "./logger"

export function DBTry(message: string) {
    return function (target, property, descriptor) {
        const originalMethod = descriptor.value

        descriptor.value = async function (...args) {
            try {
                return originalMethod.call(this, ...args)
            } catch (e) {
                Logger.error(`${message}: `, `args: `, args, e)
                throw e
            }
        }

        return descriptor
    }
}
