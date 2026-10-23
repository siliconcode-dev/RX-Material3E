// Writes reference output for all 35 MaterialShapes from Google's real code
// (extracted by extract-material-shapes.mjs) for golden-material-shapes.test.ts.
package androidx.compose.material3

import androidx.graphics.shapes.Feature
import androidx.graphics.shapes.RoundedPolygon
import java.io.File

private fun Float.j() = if (isNaN() || isInfinite()) "null" else toString()

private fun FloatArray.j() = joinToString(",", "[", "]") { it.j() }

private fun RoundedPolygon.json(): String {
    val cubics = cubics.joinToString(",", "[", "]") { it.points.j() }
    val features = features.joinToString(",", "[", "]") { f ->
        val convex = if (f is Feature.Corner) f.convex.toString() else "null"
        val type = if (f is Feature.Corner) "corner" else "edge"
        """{"type":"$type","convex":$convex,"cubics":${f.cubics.size}}"""
    }
    return """{"center":[${centerX.j()},${centerY.j()}],"bounds":${calculateBounds(approximate = false).j()},""" +
        """"cubics":$cubics,"features":$features}"""
}

fun main(args: Array<String>) {
    val s = MaterialShapes
    val all = linkedMapOf(
        "Circle" to s.Circle, "Square" to s.Square, "Slanted" to s.Slanted, "Arch" to s.Arch,
        "Fan" to s.Fan, "Arrow" to s.Arrow, "SemiCircle" to s.SemiCircle, "Oval" to s.Oval,
        "Pill" to s.Pill, "Triangle" to s.Triangle, "Diamond" to s.Diamond,
        "ClamShell" to s.ClamShell, "Pentagon" to s.Pentagon, "Gem" to s.Gem, "Sunny" to s.Sunny,
        "VerySunny" to s.VerySunny, "Cookie4Sided" to s.Cookie4Sided,
        "Cookie6Sided" to s.Cookie6Sided, "Cookie7Sided" to s.Cookie7Sided,
        "Cookie9Sided" to s.Cookie9Sided, "Cookie12Sided" to s.Cookie12Sided,
        "Ghostish" to s.Ghostish, "Clover4Leaf" to s.Clover4Leaf, "Clover8Leaf" to s.Clover8Leaf,
        "Burst" to s.Burst, "SoftBurst" to s.SoftBurst, "Boom" to s.Boom, "SoftBoom" to s.SoftBoom,
        "Flower" to s.Flower, "Puffy" to s.Puffy, "PuffyDiamond" to s.PuffyDiamond,
        "PixelCircle" to s.PixelCircle, "PixelTriangle" to s.PixelTriangle, "Bun" to s.Bun,
        "Heart" to s.Heart,
    )
    val json = all.entries.joinToString(",\n", "{\n", "\n}\n") { (id, p) -> "\"$id\":${p.json()}" }
    File(args[0]).writeText(json)
    println("wrote ${all.size} MaterialShapes to ${args[0]}")
}
