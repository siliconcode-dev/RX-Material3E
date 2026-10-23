// Writes reference output for springs from Google's real Compose code:
// SpringSimulation.kt and SpringEstimation.kt as they are, FloatSpringSpec
// and Spring extracted verbatim (extract-spring.mjs). Read by
// packages/web/test/motion/golden-spring.test.ts.
//
// - "curves": value and velocity at many play times for every MotionScheme
//   spring and Compose's Spring presets, from several starts and velocities.
// - "durations": getDurationNanos over a grid of springs, distances,
//   velocities and visibility thresholds.
package androidx.compose.animation.core

import java.io.File

private fun Float.j() = if (isNaN() || isInfinite()) "null" else toString()

// The 12 MotionScheme springs (Standard and Expressive MotionTokens) and
// Compose's presets, as (name, dampingRatio, stiffness).
private val springs = listOf(
    Triple("standard-default-spatial", 0.9f, 700.0f),
    Triple("standard-fast-spatial", 0.9f, 1400.0f),
    Triple("standard-slow-spatial", 0.9f, 300.0f),
    Triple("standard-default-effects", 1.0f, 1600.0f),
    Triple("standard-fast-effects", 1.0f, 3800.0f),
    Triple("standard-slow-effects", 1.0f, 800.0f),
    Triple("expressive-default-spatial", 0.8f, 380.0f),
    Triple("expressive-fast-spatial", 0.6f, 800.0f),
    Triple("expressive-slow-spatial", 0.8f, 200.0f),
    Triple("expressive-default-effects", 1.0f, 1600.0f),
    Triple("expressive-fast-effects", 1.0f, 3800.0f),
    Triple("expressive-slow-effects", 1.0f, 800.0f),
    Triple("default", Spring.DampingRatioNoBouncy, Spring.StiffnessMedium),
    Triple("high-bouncy-low", Spring.DampingRatioHighBouncy, Spring.StiffnessLow),
    Triple("medium-bouncy-very-low", Spring.DampingRatioMediumBouncy, Spring.StiffnessVeryLow),
    Triple("low-bouncy-high", Spring.DampingRatioLowBouncy, Spring.StiffnessHigh),
    Triple("overdamped", 1.7f, 600f),
    Triple("overdamped-slightly", 1.05f, 450f),
    Triple("medium-low", Spring.DampingRatioNoBouncy, Spring.StiffnessMediumLow),
)

// (from, to, initial velocity, threshold)
private val starts = listOf(
    listOf(0f, 1f, 0f, 0.01f),
    listOf(1f, 0f, 0f, 0.01f),
    listOf(0f, 100f, 0f, 0.01f),
    listOf(0f, 100f, 0f, 0.4f),
    listOf(-30f, 250f, 1200f, 1f),
    listOf(0.3f, 0.7f, -4f, 0.01f),
    listOf(5f, 5f, 80f, 0.01f),
)

fun main(args: Array<String>) {
    val curves = mutableListOf<String>()
    for ((name, damping, stiffness) in springs) {
        for ((si, s) in starts.withIndex()) {
            val (from, to, v0, threshold) = s
            val spec = FloatSpringSpec(damping, stiffness, threshold)
            val duration = spec.getDurationNanos(from, to, v0)
            val times = mutableListOf<Long>()
            // Every ms for the first 40ms, then every 7ms, to 3s or the end.
            var t = 0L
            while (t <= minOf(duration / 1_000_000 + 20, 3000)) {
                times.add(t * 1_000_000 + (t % 3) * 333_333)
                t += if (t < 40) 1 else 7
            }
            val values = times.joinToString(",", "[", "]") {
                spec.getValueFromNanos(it, from, to, v0).j()
            }
            val velocities = times.joinToString(",", "[", "]") {
                spec.getVelocityFromNanos(it, from, to, v0).j()
            }
            curves.add(
                """{"spring":"$name","damping":${damping.j()},"stiffness":${stiffness.j()},""" +
                    """"start":$si,"from":${from.j()},"to":${to.j()},"velocity":${v0.j()},""" +
                    """"threshold":${threshold.j()},"durationNanos":$duration,""" +
                    """"times":${times.joinToString(",", "[", "]")},"values":$values,""" +
                    """"velocities":$velocities}"""
            )
        }
    }
    val durations = mutableListOf<String>()
    val dampings = floatArrayOf(0f, 0.1f, 0.5f, 0.6f, 0.8f, 0.9f, 0.99f, 1f, 1.01f, 1.5f, 3f)
    val stiffnesses = floatArrayOf(50f, 200f, 380f, 700f, 1500f, 3800f, 10000f)
    val displacements = floatArrayOf(0f, 0.001f, 0.5f, 1f, -1f, 37f, 100f, -400f)
    val velocities = floatArrayOf(0f, 1f, -25f, 300f, -2000f)
    for (d in dampings) for (k in stiffnesses) for (x in displacements) for (v in velocities) {
        val spec = FloatSpringSpec(d, k, 0.01f)
        durations.add("[${d.j()},${k.j()},${x.j()},${v.j()},${spec.getDurationNanos(x, 0f, v)}]")
    }
    File(args[0]).writeText(
        "{\n\"curves\":[\n" + curves.joinToString(",\n") + "\n],\n\"durations\":[\n" +
            durations.joinToString(",\n") + "\n]\n}\n"
    )
    println("wrote ${curves.size} spring curves and ${durations.size} durations to ${args[0]}")
}
