import { pickBy } from "lodash"

export const timeout = (ms) => new Promise((r) => setTimeout(r, ms))

export const parseJSON = (str, defaultValue) => {
    if (!str) return defaultValue
    try {
        return JSON.parse(str)
    } catch {
        return defaultValue
    }
}

export const parseJSONObject = (str) => parseJSON(str, {})

export const parseJSONArray = (str) => parseJSON(str, [])

export const isNullable = (value) => value === null || value === undefined

export const onlyChars = (str, chars) => {
    const filteringRegexp = new RegExp(`[^${chars.join("")}]`, "gs")
    return str.replace(filteringRegexp, "")
}

/**
 * returns value, if it is between a and b.
 * otherwise, returns the number it's gone past.
 */
export const clamp = (value, min, max) =>
    min < max
        ? value < min
            ? min
            : value > max
            ? max
            : value
        : value < max
        ? max
        : value > min
        ? min
        : value

/**
 * returns an array with length equals (to - from / step). If not "to", it will be [0, from)
 * @param {number} from - start value
 * @param {number | undefined} to - end value
 * @param {number | undefined} [step=1] - step value
 */
export const range = (from, to, step = 1) => {
    if (!to) {
        ;[from, to] = [0, from]
    }
    const size = Math.floor((to - from) / step)
    if (size <= 0) return []
    return [...Array(size).keys()].map((k) => from + k * step)
}

/**
 * returns random number [from, to). If not "to", it will be [0, from)
 * @param {number} from - start value
 * @param {number} to - end value
 */
export const random = (from, to) => {
    if (!to) {
        ;[from, to] = [0, from]
    }
    to -= from
    return Math.floor(Math.random() * to + from)
}

/**
 * returns stringified variable if it's not string already
 * otherwise insta returns variable
 * @param object {any} var to stringify
 * @returns {string} stringified value
 */
export const stringify = (object) => {
    if (typeof object === "string") {
        return object
    }
    return JSON.stringify(object, null, 2)
}

/**
 * returns object without keys
 * @param object {Object}
 * @param keys {Array<string>}
 */
export const except = (object, keys) =>
    pickBy(object, (_, key) => !keys.includes(key))

/**
 * returns a string with a capital first letter
 * @param {string} str - some string
 * @return string
 */
export const capitalizeFirstLetter = (str) =>
    str ? str[0].toUpperCase() + str.slice(1) : str
