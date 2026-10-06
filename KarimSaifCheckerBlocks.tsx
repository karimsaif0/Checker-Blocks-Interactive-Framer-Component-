/\*\*

 \* Made with 💛 by Karim Saif

 \* Created and customized for Framer by Karim Saif

 \*

 \* @framerIntrinsicWidth 1200

 \* @framerIntrinsicHeight 800

 \* @framerSupportedLayoutWidth any

 \* @framerSupportedLayoutHeight any

 \*/



"use client"



import \* as React from "react"

import { useEffect, useRef } from "react"

import {

    addPropertyControls,

    ControlType,

    useIsStaticRenderer,

    useReducedMotion,

} from "framer"



type Preset = "Poster" | "Micro" | "Bold" | "Dense" | "Minimal" | "Custom"



type Pattern =

    | { kind: "empty" }

    | { kind: "solid" }

    | { kind: "ring" }

    | { kind: "dot" }

    | { kind: "checker"; divisions: number; phase: number }



interface Block {

    col: number

    row: number

    span: number

    pattern: Pattern

    glitch: Pattern[]

    changedAt: number

}



interface KarimSaifCheckerBlocksProps {

    preset: Preset

    backgroundColor: string

    color: string

    cellSize: number

    speed: number

    animate: boolean

    interaction: boolean

    changeAmount: number

    largeBlocks: number

    seed: number

}



interface ResolvedSettings {

    cellSize: number

    speed: number

    changeAmount: number

    largeBlocks: number

}



const MAX_DPR = 2

const BEAT_DURATION = 1.2

const GLITCH_STEP = 0.08

const GLITCH_STEPS = 3



const clamp = (value: number, min: number, max: number) =>

    Math.min(max, Math.max(min, value))



const safeNumber = (

    value: number,

    fallback: number,

    min: number,

    max: number

) => {

    if (!Number.isFinite(value)) return fallback

    return clamp(value, min, max)

}



const resolvePreset = (

    preset: Preset,

    props: KarimSaifCheckerBlocksProps

): ResolvedSettings => {

    switch (preset) {

        case "Micro":

            return {

                cellSize: 42,

                speed: 1.35,

                changeAmount: 12,

                largeBlocks: 18,

            }



        case "Bold":

            return {

                cellSize: 132,

                speed: 0.85,

                changeAmount: 10,

                largeBlocks: 52,

            }



        case "Dense":

            return {

                cellSize: 56,

                speed: 1.6,

                changeAmount: 18,

                largeBlocks: 38,

            }



        case "Minimal":

            return {

                cellSize: 112,

                speed: 0.65,

                changeAmount: 4,

                largeBlocks: 22,

            }



        case "Custom":

            return {

                cellSize: props.cellSize,

                speed: props.speed,

                changeAmount: props.changeAmount,

                largeBlocks: props.largeBlocks,

            }



        case "Poster":

        default:

            return {

                cellSize: 84,

                speed: 1,

                changeAmount: 8,

                largeBlocks: 30,

            }

    }

}



const createRandom = (seed: number) => {

    let state = Math.floor(seed) >>> 0



    if (state === 0) state = 1



    return () => {

        state += 0x6d2b79f5



        let value = state



        value = Math.imul(value ^ (value >>> 15), value | 1)

        value ^= value + Math.imul(value ^ (value >>> 7), value | 61)



        return ((value ^ (value >>> 14)) >>> 0) / 4294967296

    }

}



const randomPattern = (big: boolean, random: () => number): Pattern => {

    const value = random()



    if (value < 0.4) return { kind: "empty" }

    if (value < 0.6) return { kind: "solid" }

    if (value < 0.65) return { kind: "ring" }



    if (value < 0.67 && !big) {

        return { kind: "dot" }

    }



    const options = big ? [4, 6, 8] : [2, 4, 8, 12, 16, 24]



    const index = Math.floor(random() \* options.length)



    return {

        kind: "checker",

        divisions: options[index],

        phase: random() < 0.5 ? 0 : 1,

    }

}



export default function KarimSaifCheckerBlocks({

    preset = "Poster",

    backgroundColor = "#EC1C24",

    color = "#FFFFFF",

    cellSize = 84,

    speed = 1,

    animate = true,

    interaction = true,

    changeAmount = 8,

    largeBlocks = 30,

    seed = 24,

}: KarimSaifCheckerBlocksProps) {

    const hostRef = useRef\<HTMLDivElement>(null)

    const canvasRef = useRef\<HTMLCanvasElement>(null)



    const isStaticRenderer = useIsStaticRenderer()

    const prefersReducedMotion = useReducedMotion()



    useEffect(() => {

        const host = hostRef.current

        const canvas = canvasRef.current



        if (!host || !canvas) return



        const ctx = canvas.getContext("2d", {

            alpha: false,

        })



        if (!ctx) return



        const resolved = resolvePreset(preset, {

            preset,

            backgroundColor,

            color,

            cellSize,

            speed,

            animate,

            interaction,

            changeAmount,

            largeBlocks,

            seed,

        })



        const safeCellSize = Math.round(

            safeNumber(resolved.cellSize, 84, 24, 240)

        )



        const safeSpeed = safeNumber(resolved.speed, 1, 0.1, 4)



        const safeChangeAmount =

            safeNumber(resolved.changeAmount, 8, 1, 100) / 100



        const safeLargeBlocks =

            safeNumber(resolved.largeBlocks, 30, 0, 100) / 100



        const safeSeed = Math.round(safeNumber(seed, 24, 1, 99999))



        const staticMode = isStaticRenderer || prefersReducedMotion === true



        let width = 1

        let height = 1

        let offsetX = 0

        let offsetY = 0

        let columns = 2

        let rows = 2



        let blocks: Block[] = []

        let cellMap: Array\<Block | undefined> = []



        let animationFrame = 0

        let resizeFrame = 0

        let pointerGlitchFrame = 0



        let previousTime = 0

        let elapsed = 0

        let nextBeat = BEAT_DURATION



        let visible = true

        let destroyed = false

        let hoveredBlock: Block | null = null



        const runtimeRandom = createRandom((safeSeed \* 2654435761) >>> 0 || 1)



        const mapIndex = (col: number, row: number) => row \* columns + col



        const registerBlock = (block: Block) => {

            blocks.push(block)



            for (let row = block.row; row < block.row + block.span; row++) {

                for (let col = block.col; col < block.col + block.span; col++) {

                    if (col >= 0 && col < columns && row >= 0 && row < rows) {

                        cellMap[mapIndex(col, row)] = block

                    }

                }

            }

        }



        const build = () => {

            blocks = []

            cellMap = new Array(columns \* rows)

            hoveredBlock = null



            const layoutSeed =

                (safeSeed ^

                    Math.imul(columns + 1, 73856093) ^

                    Math.imul(rows + 1, 19349663)) >>>

                0



            const random = createRandom(layoutSeed || 1)



            for (let row = 0; row < rows; row += 2) {

                for (let col = 0; col < columns; col += 2) {

                    if (random() < safeLargeBlocks) {

                        registerBlock({

                            col,

                            row,

                            span: 2,

                            pattern: randomPattern(true, random),

                            glitch: [],

                            changedAt: -Infinity,

                        })



                        continue

                    }



                    for (let index = 0; index < 4; index++) {

                        registerBlock({

                            col: col + (index & 1),

                            row: row + (index >> 1),

                            span: 1,

                            pattern: randomPattern(false, random),

                            glitch: [],

                            changedAt: -Infinity,

                        })

                    }

                }

            }

        }



        const paintPattern = (

            pattern: Pattern,

            x: number,

            y: number,

            size: number

        ) => {

            ctx.fillStyle = color



            if (pattern.kind === "empty") return



            if (pattern.kind === "solid") {

                ctx.fillRect(x, y, size, size)

                return

            }



            if (pattern.kind === "ring") {

                const inset = Math.max(1, Math.round(size \* 0.25))



                ctx.fillRect(x, y, size, size)



                ctx.fillStyle = backgroundColor



                ctx.fillRect(

                    x + inset,

                    y + inset,

                    Math.max(0, size - inset \* 2),

                    Math.max(0, size - inset \* 2)

                )



                return

            }



            if (pattern.kind === "dot") {

                ctx.beginPath()



                ctx.arc(

                    x + size \* 0.5,

                    y + size \* 0.5,

                    size \* 0.36,

                    0,

                    Math.PI \* 2

                )



                ctx.fill()

                return

            }



            const divisions = Math.max(1, Math.floor(pattern.divisions))



            for (let row = 0; row < divisions; row++) {

                const y0 = y + Math.round((row \* size) / divisions)



                const y1 = y + Math.round(((row + 1) \* size) / divisions)



                for (

                    let col = (row + pattern.phase) & 1;

                    col < divisions;

                    col += 2

                ) {

                    const x0 = x + Math.round((col \* size) / divisions)



                    const x1 = x + Math.round(((col + 1) \* size) / divisions)



                    ctx.fillRect(

                        x0,

                        y0,

                        Math.max(1, x1 - x0),

                        Math.max(1, y1 - y0)

                    )

                }

            }

        }



        const currentPattern = (block: Block) => {

            const glitchIndex = Math.floor(

                (elapsed - block.changedAt) / GLITCH_STEP

            )



            if (glitchIndex >= 0 && glitchIndex < block.glitch.length) {

                return block.glitch[glitchIndex]

            }



            return block.pattern

        }



        const draw = () => {

            if (destroyed) return



            ctx.fillStyle = backgroundColor

            ctx.fillRect(0, 0, width, height)



            for (const block of blocks) {

                paintPattern(

                    currentPattern(block),

                    offsetX + block.col \* safeCellSize,

                    offsetY + block.row \* safeCellSize,

                    block.span \* safeCellSize

                )

            }

        }



        const changeBlock = (block: Block) => {

            block.glitch = [

                {

                    kind: "checker",

                    divisions: 8 \* block.span,

                    phase: 0,

                },

                {

                    kind: "checker",

                    divisions: 16 \* block.span,

                    phase: 1,

                },

                {

                    kind: "checker",

                    divisions: 32 \* block.span,

                    phase: 0,

                },

            ]



            block.pattern = randomPattern(block.span === 2, runtimeRandom)



            block.changedAt = elapsed

        }



        const triggerBeat = () => {

            let changed = false



            for (const block of blocks) {

                if (runtimeRandom() < safeChangeAmount) {

                    changeBlock(block)

                    changed = true

                }

            }



            if (!changed && blocks.length > 0 && safeChangeAmount > 0) {

                const index = Math.min(

                    blocks.length - 1,

                    Math.floor(runtimeRandom() \* blocks.length)

                )



                changeBlock(blocks[index])

            }

        }



        const hasActiveGlitch = () => {

            const duration = GLITCH_STEP \* GLITCH_STEPS



            for (const block of blocks) {

                const age = elapsed - block.changedAt



                if (age >= 0 && age < duration) {

                    return true

                }

            }



            return false

        }



        const canAnimate = () =>

            !destroyed &&

            !staticMode &&

            animate &&

            safeSpeed > 0 &&

            visible &&

            !document.hidden



        const tick = (now: number) => {

            animationFrame = 0



            if (!canAnimate()) return



            const delta =

                previousTime > 0

                    ? Math.min(Math.max((now - previousTime) / 1000, 0), 0.1)

                    : 0



            previousTime = now

            elapsed += delta \* safeSpeed



            let beatTriggered = false



            if (elapsed >= nextBeat) {

                triggerBeat()

                nextBeat = elapsed + BEAT_DURATION

                beatTriggered = true

            }



            if (beatTriggered || hasActiveGlitch()) {
                draw()

            }



            animationFrame = requestAnimationFrame(tick)

        }



        const stopAnimation = () => {

            if (animationFrame) {

                cancelAnimationFrame(animationFrame)

                animationFrame = 0

            }



            previousTime = 0

        }



        const startAnimation = () => {

            stopAnimation()



            if (!canAnimate()) return



            previousTime = performance.now()



            animationFrame = requestAnimationFrame(tick)

        }



        const updateAnimation = () => {

            if (canAnimate()) {

                startAnimation()

            } else {

                stopAnimation()

                draw()

            }

        }



        const resize = () => {

            if (destroyed) return



            const nextWidth = Math.max(1, Math.round(host.clientWidth))



            const nextHeight = Math.max(1, Math.round(host.clientHeight))



            const dpr = Math.min(

                Math.max(window\.devicePixelRatio || 1, 1),

                MAX_DPR

            )



            const pixelWidth = Math.max(1, Math.round(nextWidth \* dpr))



            const pixelHeight = Math.max(1, Math.round(nextHeight \* dpr))



            const nextColumns = Math.max(

                2,

                Math.ceil(nextWidth / safeCellSize / 2) \* 2

            )



            const nextRows = Math.max(

                2,

                Math.ceil(nextHeight / safeCellSize / 2) \* 2

            )



            const gridChanged = nextColumns !== columns || nextRows !== rows



            width = nextWidth

            height = nextHeight

            columns = nextColumns

            rows = nextRows



            if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {

                canvas.width = pixelWidth

                canvas.height = pixelHeight

            }



            canvas.style.width = \`${width}px\`

            canvas.style.height = \`${height}px\`



            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)



            offsetX = Math.round((width - columns \* safeCellSize) / 2)



            offsetY = Math.round((height - rows \* safeCellSize) / 2)



            if (gridChanged || blocks.length === 0) {

                build()

            }



            draw()

        }



        const scheduleResize = () => {

            if (resizeFrame || destroyed) return



            resizeFrame = requestAnimationFrame(() => {

                resizeFrame = 0

                resize()

            })

        }



        const startPointerGlitch = (block: Block) => {

            if (pointerGlitchFrame) {

                cancelAnimationFrame(pointerGlitchFrame)

                pointerGlitchFrame = 0

            }



            const startTime = performance.now()

            const startElapsed = elapsed

            const duration = GLITCH_STEP \* GLITCH_STEPS



            const pointerTick = (now: number) => {

                pointerGlitchFrame = 0



                if (destroyed || staticMode) return



                if (canAnimate()) return



                const progress = Math.min((now - startTime) / 1000, duration)



                elapsed = startElapsed + progress

                draw()



                if (progress < duration) {

                    pointerGlitchFrame = requestAnimationFrame(pointerTick)

                }

            }



            pointerGlitchFrame = requestAnimationFrame(pointerTick)

        }



        const pointerMove = (event: PointerEvent) => {

            if (destroyed || staticMode || !interaction) {

                return

            }



            const rect = host.getBoundingClientRect()



            const localX = event.clientX - rect.left - offsetX



            const localY = event.clientY - rect.top - offsetY



            const col = Math.floor(localX / safeCellSize)



            const row = Math.floor(localY / safeCellSize)



            if (col < 0 || col >= columns || row < 0 || row >= rows) {

                hoveredBlock = null

                return

            }



            const block = cellMap[mapIndex(col, row)]



            if (!block || block === hoveredBlock) {

                return

            }



            hoveredBlock = block



            const glitchDuration = GLITCH_STEP \* GLITCH_STEPS



            if (elapsed - block.changedAt < glitchDuration) {

                return

            }



            changeBlock(block)

            draw()



            if (!canAnimate()) {

                startPointerGlitch(block)

            }

        }



        const pointerLeave = () => {

            hoveredBlock = null

        }



        const handleVisibility = () => {

            updateAnimation()

        }



        const resizeObserver = new ResizeObserver(scheduleResize)



        resizeObserver.observe(host)



        let intersectionObserver: IntersectionObserver | null = null



        if (typeof IntersectionObserver !== "undefined") {

            intersectionObserver = new IntersectionObserver(

                ([entry]) => {

                    visible = entry?.isIntersecting ?? true



                    updateAnimation()

                },

                {

                    threshold: 0,

                }

            )



            intersectionObserver.observe(host)

        }



        host.addEventListener("pointermove", pointerMove, { passive: true })



        host.addEventListener("pointerleave", pointerLeave, { passive: true })



        document.addEventListener("visibilitychange", handleVisibility)



        resize()



        if (staticMode) {

            draw()

        } else {

            updateAnimation()

        }



        return () => {

            destroyed = true



            stopAnimation()



            if (resizeFrame) {

                cancelAnimationFrame(resizeFrame)

            }



            if (pointerGlitchFrame) {

                cancelAnimationFrame(pointerGlitchFrame)

            }



            resizeObserver.disconnect()

            intersectionObserver?.disconnect()



            host.removeEventListener("pointermove", pointerMove)



            host.removeEventListener("pointerleave", pointerLeave)



            document.removeEventListener("visibilitychange", handleVisibility)

        }

    }, [

        preset,

        backgroundColor,

        color,

        cellSize,

        speed,

        animate,

        interaction,

        changeAmount,

        largeBlocks,

        seed,

        isStaticRenderer,

        prefersReducedMotion,

    ])



    return (

        \<div

            ref={hostRef}

            style={{

                position: "relative",

                width: "100%",

                height: "100%",

                minWidth: 1,

                minHeight: 1,

                overflow: "hidden",

                backgroundColor,

            }}

        >

            \<canvas

                ref={canvasRef}

                aria-hidden="true"

                style={{

                    position: "absolute",

                    inset: 0,

                    width: "100%",

                    height: "100%",

                    display: "block",

                    pointerEvents: "none",

                }}

            />

        \</div>

    )

}



KarimSaifCheckerBlocks.displayName = "Karim Saif Checker Blocks"



addPropertyControls(KarimSaifCheckerBlocks, {

    preset: {

        type: ControlType.Enum,

        title: "Preset",

        options: ["Poster", "Micro", "Bold", "Dense", "Minimal", "Custom"],

        optionTitles: [

            "Poster",

            "Micro Grid",

            "Bold Blocks",

            "Dense Glitch",

            "Minimal",

            "Custom",

        ],

        defaultValue: "Poster",

        displaySegmentedControl: false,

        description:

            "Selects a ready-made grid style or choose Custom to manually control the grid size, block ratio, animation speed, and change amount.",

    },



    backgroundColor: {

        type: ControlType.Color,

        title: "Background",

        defaultValue: "#EC1C24",

        description:

            "Sets the base background color behind the geometric poster pattern.",

    },



    color: {

        type: ControlType.Color,

        title: "Pattern",

        defaultValue: "#FFFFFF",

        description:

            "Sets the foreground color used for blocks, rings, dots, and checker patterns.",

    },



    cellSize: {

        type: ControlType.Number,

        title: "Cell Size",

        defaultValue: 84,

        min: 24,

        max: 240,

        step: 1,

        unit: "px",

        displayStepper: true,

        hidden: (props) => props.preset !== "Custom",

        description:

            "Controls the base size of each grid cell when the Custom preset is selected.",

    },



    largeBlocks: {

        type: ControlType.Number,

        title: "Large Blocks",

        defaultValue: 30,

        min: 0,

        max: 100,

        step: 1,

        unit: "%",

        displayStepper: true,

        hidden: (props) => props.preset !== "Custom",

        description:

            "Controls how often four neighboring cells merge into a larger two-by-two block when using the Custom preset.",

    },



    animate: {

        type: ControlType.Boolean,

        title: "Animate",

        defaultValue: true,

        enabledTitle: "On",

        disabledTitle: "Off",

        description:

            "Enables automatic rhythmic pattern changes and checker glitch transitions.",

    },



    speed: {

        type: ControlType.Number,

        title: "Speed",

        defaultValue: 1,

        min: 0.1,

        max: 4,

        step: 0.1,

        displayStepper: true,

        hidden: (props) => props.preset !== "Custom" || !props.animate,

        description:

            "Controls the automatic animation speed when the Custom preset is selected.",

    },



    changeAmount: {

        type: ControlType.Number,

        title: "Change",

        defaultValue: 8,

        min: 1,

        max: 100,

        step: 1,

        unit: "%",

        displayStepper: true,

        hidden: (props) => props.preset !== "Custom" || !props.animate,

        description:

            "Controls how many blocks are likely to change on each animation beat when using the Custom preset.",

    },



    interaction: {

        type: ControlType.Boolean,

        title: "Interaction",

        defaultValue: true,

        enabledTitle: "On",

        disabledTitle: "Off",

        description:

            "Enables pointer interaction so blocks glitch into new patterns as the cursor moves across the grid.",

    },



    seed: {

        type: ControlType.Number,

        title: "Seed",

        defaultValue: 24,

        min: 1,

        max: 99999,

        step: 1,

        displayStepper: true,

        description: "Made with 💛 by [@karimsaif]\(https\://x.com/karimsaif0)",

    },

})