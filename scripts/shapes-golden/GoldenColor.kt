package androidx.compose.ui.graphics

import java.io.File

// Compose's lerp(Color, Color, fraction) between color pairs (the baseline
// light and dark container and full colors, and two odd ones), at fractions
// inside and past 0..1, written as 8-bit sRGB.
fun main(args: Array<String>) {
    val pairs =
        listOf(
            0xFFEADDFF to 0xFF6750A4,
            0xFF21005D to 0xFFFFFFFF,
            0xFFE8DEF8 to 0xFF625B71,
            0xFFFFD8E4 to 0xFF7D5260,
            0xFF4F378B to 0xFFD0BCFF,
            0xFF12345A to 0xFFFEDCBA,
            0xFF00FF00 to 0xFFFF00FF,
        )
    val fractions =
        listOf(-0.2f, 0f, 0.1f, 0.25f, 0.333f, 0.5f, 0.6f, 0.75f, 0.9f, 1f, 1.05f, 1.3f)
    val rows = mutableListOf<String>()
    for ((a, b) in pairs) {
        for (t in fractions) {
            val argb = lerp(Color(a), Color(b), t).toArgb()
            val rgb = listOf(argb shr 16, argb shr 8, argb).map { it and 0xFF }
            rows += "  {\"from\": ${a and 0xFFFFFF}, \"to\": ${b and 0xFFFFFF}, " +
                "\"fraction\": $t, \"rgb\": [${rgb.joinToString(", ")}]}"
        }
    }
    File(args[0]).writeText("[\n" + rows.joinToString(",\n") + "\n]\n")
}
