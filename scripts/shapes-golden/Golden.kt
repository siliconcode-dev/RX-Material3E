// Generates reference output from Google's real androidx graphics-shapes code
// for packages/web/test/shapes/golden.test.ts. Run with ./generate.sh.
//
// Compiled together with the graphics-shapes sources, so it is in their
// package and can read internal members (feature types, convexity).
package androidx.graphics.shapes

import java.io.File

private fun Float.j() = if (isNaN() || isInfinite()) "null" else toString()

private fun FloatArray.j() = joinToString(",", "[", "]") { it.j() }

private fun RoundedPolygon.json(): String {
    val cubics = cubics.joinToString(",", "[", "]") { it.points.j() }
    val features = features.joinToString(",", "[", "]") { f ->
        val type = if (f is Feature.Corner) "corner" else "edge"
        val convex = if (f is Feature.Corner) f.convex.toString() else "null"
        """{"type":"$type","convex":$convex,"cubics":${f.cubics.joinToString(",", "[", "]") { it.points.j() }}}"""
    }
    return """{"center":[${centerX.j()},${centerY.j()}],""" +
        """"bounds":${calculateBounds().j()},""" +
        """"exactBounds":${calculateBounds(approximate = false).j()},""" +
        """"maxBounds":${calculateMaxBounds().j()},""" +
        """"cubics":$cubics,"features":$features}"""
}

fun main(args: Array<String>) {
    val r = { radius: Float, smoothing: Float -> CornerRounding(radius, smoothing) }
    val cases = linkedMapOf<String, RoundedPolygon>(
        "poly3" to RoundedPolygon(3),
        "poly4" to RoundedPolygon(4),
        "poly5" to RoundedPolygon(5),
        "poly8" to RoundedPolygon(8),
        "poly6-rounded" to RoundedPolygon(6, rounding = r(0.2f, 0f)),
        "poly4-smoothed" to RoundedPolygon(4, rounding = r(0.3f, 0.5f)),
        "poly5-offset-full-smoothing" to
            RoundedPolygon(5, radius = 2f, centerX = 1f, centerY = 2f, rounding = r(0.4f, 1f)),
        "poly7-per-vertex" to
            RoundedPolygon(
                7,
                perVertexRounding = List(7) { i -> r(0.05f * (i + 1), i / 6f) },
            ),
        "vertices-triangle-uneven" to
            RoundedPolygon(
                floatArrayOf(0f, 0f, 1f, 0f, 0.5f, 1f),
                perVertexRounding = listOf(r(1f, 0f), r(1f, 1f), CornerRounding.Unrounded),
            ),
        "vertices-rect-competing" to
            RoundedPolygon(
                floatArrayOf(0f, 0f, 5f, 0f, 5f, 1f, 0f, 1f),
                perVertexRounding =
                    listOf(r(0.4f, 0.5f), CornerRounding.Unrounded, CornerRounding.Unrounded, r(0.2f, 1f)),
            ),
        "vertices-concave" to
            RoundedPolygon(
                floatArrayOf(0f, 0f, 2f, 0f, 2f, 2f, 1f, 1f, 0f, 2f),
                rounding = r(0.3f, 0.4f),
            ),
        "vertices-repeated-point" to RoundedPolygon(floatArrayOf(0f, 0f, 1f, 0f, 1f, 0f, 0f, 1f)),
        "vertices-collinear" to
            RoundedPolygon(floatArrayOf(0f, 0f, 0.5f, 0f, 1f, 0f, 1f, 1f, 0f, 1f), rounding = r(0.1f, 0f)),
        "vertices-collinear-diagonal" to
            RoundedPolygon(
                floatArrayOf(0.1f, 0.1f, 0.4f, 0.4f, 0.7f, 0.7f, 0.7f, 1.3f, 0.1f, 1.3f),
                rounding = r(0.05f, 0.5f),
            ),
        // The middle three vertices are within rounding error of a straight line.
        "vertices-near-collinear" to RoundedPolygon(floatArrayOf(0.4700031876564026f, 1.1063426733016968f, 0.2314673811197281f, 0.8148945569992065f, -0.08738595992326736f, 0.42531275749206543f, 1.5f, -0.5f)),
        "circle" to RoundedPolygon.circle(),
        "circle3" to RoundedPolygon.circle(3),
        "circle12-offset" to RoundedPolygon.circle(12, radius = 3f, centerX = 1f, centerY = 2f),
        "rectangle" to RoundedPolygon.rectangle(),
        "rectangle-rounded" to RoundedPolygon.rectangle(3f, 1f, rounding = r(0.4f, 0.6f)),
        "rectangle-per-vertex" to
            RoundedPolygon.rectangle(
                2f,
                1.5f,
                perVertexRounding = listOf(r(0.1f, 0f), r(0.6f, 0.2f), r(0f, 0f), r(0.3f, 1f)),
                centerX = -1f,
                centerY = 0.5f,
            ),
        "star4" to RoundedPolygon.star(4),
        "star5-inner" to
            RoundedPolygon.star(5, innerRadius = 0.4f, rounding = r(0.1f, 0f), innerRounding = r(0.3f, 0.5f)),
        "star12-smooth" to RoundedPolygon.star(12, rounding = r(0.05f, 1f)),
        "star8-offset" to
            RoundedPolygon.star(8, 3f, 1.2f, rounding = r(0.2f, 0f), centerX = 5f, centerY = 5f),
        "pill" to RoundedPolygon.pill(),
        "pill-smooth" to RoundedPolygon.pill(3f, 1f, smoothing = 0.5f),
        "pill-tall" to RoundedPolygon.pill(1f, 3f),
        "pillStar" to RoundedPolygon.pillStar(),
        "pillStar-rounded" to RoundedPolygon.pillStar(rounding = r(0.5f, 0.2f)),
        "pillStar-custom" to
            RoundedPolygon.pillStar(
                width = 1f,
                height = 2f,
                numVerticesPerRadius = 6,
                innerRadiusRatio = 0.7f,
                rounding = r(0.1f, 0f),
                vertexSpacing = 0.2f,
                startLocation = 0.3f,
            ),
        "normalized-star5" to RoundedPolygon.star(5, rounding = r(0.1f, 0.3f)).normalized(),
        "normalized-pill" to RoundedPolygon.pill(3f, 1f).normalized(),
        "transformed-hexagon" to
            RoundedPolygon(6, rounding = r(0.25f, 0.5f)).transformed { x, y ->
                TransformResult(x * 2f + y * 0.5f + 3f, y * 1.5f - 1f)
            },
        "empty" to RoundedPolygon(6, radius = 0f, rounding = r(0.1f, 0f)),
    )
    val json = cases.entries.joinToString(",\n", "{\n", "\n}\n") { (id, p) -> "\"$id\":${p.json()}" }
    File(args[0]).writeText(json)
    println("wrote ${cases.size} cases to ${args[0]}")
}
