// Writes reference output for Morph from Google's real code: graphics-shapes'
// Morph, FeatureMapping, FloatMapping and PolygonMeasure, MaterialShapes and
// Compose's Morph.toPath (both extracted verbatim). Read by
// packages/web/test/shapes/golden-morph.test.ts.
//
// - "cases": full detail for chosen pairs (measured features, the feature
//   mapping, every matched cubic pair, the morph at many progress values,
//   bounds, and Compose's path commands).
// - "matrix": every MaterialShapes pair (35 x 35) in compact form: the
//   number of matched pairs, the feature mapping and weighted sums of the
//   matched cubics, so any difference in cutting or matching shows up.
// - "raster": 64x64 fills of Compose paths drawn with Java2D, as an
//   independent rasterizer.
package androidx.compose.material3

import androidx.graphics.shapes.CornerRounding
import androidx.graphics.shapes.Cubic
import androidx.graphics.shapes.LengthMeasurer
import androidx.graphics.shapes.MeasuredPolygon
import androidx.graphics.shapes.Morph
import androidx.graphics.shapes.RoundedPolygon
import androidx.graphics.shapes.TransformResult
import androidx.graphics.shapes.circle
import androidx.graphics.shapes.doMapping
import androidx.graphics.shapes.featureMapper
import androidx.graphics.shapes.pill
import androidx.graphics.shapes.pillStar
import androidx.graphics.shapes.rectangle
import androidx.graphics.shapes.star
import java.awt.RenderingHints
import java.awt.geom.Path2D
import java.awt.image.BufferedImage
import java.io.File
import kotlin.math.cos
import kotlin.math.sin

private fun Float.j() = if (isNaN() || isInfinite()) "null" else toString()

private fun FloatArray.j() = joinToString(",", "[", "]") { it.j() }

private fun Double.g() = if (isNaN() || isInfinite()) "null" else "%.7g".format(this)

private fun mappingJson(m: List<Pair<Float, Float>>) =
    m.joinToString(",", "[", "]") { "[${it.first.j()},${it.second.j()}]" }

private fun pathJson(p: Path) =
    p.commands.joinToString(",", "[", "]") { (c, pts) ->
        (listOf("\"$c\"") + pts.map { it.j() }).joinToString(",", "[", "]")
    }

/** Weighted sums of each of the 8 coordinates, weights sin(i + 1). */
private fun checksum(cubics: List<Cubic>): String {
    val sums = DoubleArray(8)
    cubics.forEachIndexed { i, c ->
        val w = sin(i + 1.0)
        for (k in 0 until 8) sums[k] += w * c.points[k]
    }
    return sums.joinToString(",", "[", "]") { it.g() }
}

private val progresses =
    floatArrayOf(0f, 0.05f, 0.1f, 0.2f, 0.25f, 0.3f, 1f / 3, 0.4f, 0.5f, 0.6f, 2f / 3, 0.7f,
        0.75f, 0.8f, 0.9f, 0.95f, 1f, -0.1f, 1.15f)
private val fullProgresses = floatArrayOf(0f, 0.25f, 0.5f, 0.75f, 1f, 1.15f)
private val pathProgresses = floatArrayOf(0f, 0.3f, 0.5f, 1f)

private fun caseJson(p1: RoundedPolygon, p2: RoundedPolygon, pivot: Float): String {
    val m1 = MeasuredPolygon.measurePolygon(LengthMeasurer(), p1)
    val m2 = MeasuredPolygon.measurePolygon(LengthMeasurer(), p2)
    val features = { m: MeasuredPolygon ->
        m.features.joinToString(",", "[", "]") { it.progress.j() }
    }
    val corners1 = m1.features.filter { it.feature is androidx.graphics.shapes.Feature.Corner }
    val corners2 = m2.features.filter { it.feature is androidx.graphics.shapes.Feature.Corner }
    val mapping = doMapping(corners1, corners2)
    val cut = featureMapper(m1.features, m2.features).map(0f)
    val morph = Morph(p1, p2)
    val match = morph.morphMatch.joinToString(",", "[", "]") {
        "[${it.first.points.j()},${it.second.points.j()}]"
    }
    val full = fullProgresses.joinToString(",", "{", "}") { pr ->
        "\"${pr.j()}\":" + morph.asCubics(pr).joinToString(",", "[", "]") { it.points.j() }
    }
    val sums = progresses.joinToString(",", "{", "}") { pr ->
        "\"${pr.j()}\":[${morph.asCubics(pr).size},${checksum(morph.asCubics(pr))}]"
    }
    val forEach = run {
        val out = mutableListOf<String>()
        morph.forEachCubic(0.4f) { out.add(it.points.j()) }
        out.joinToString(",", "[", "]")
    }
    val paths = pathProgresses.joinToString(",", "[", "]") { pr ->
        listOf(0, 270).joinToString(",") { angle ->
            val path =
                morph.toPath(
                    progress = pr,
                    startAngle = angle,
                    rotationPivotX = pivot,
                    rotationPivotY = pivot,
                )
            """{"progress":${pr.j()},"startAngle":$angle,"pivot":${pivot.j()},"commands":${pathJson(path)}}"""
        }
    }
    return """{"features1":${features(m1)},"features2":${features(m2)},""" +
        """"mapping":${mappingJson(mapping)},"cutPoint":${cut.j()},""" +
        """"bounds":${morph.calculateBounds().j()},""" +
        """"exactBounds":${morph.calculateBounds(approximate = false).j()},""" +
        """"maxBounds":${morph.calculateMaxBounds().j()},""" +
        """"match":$match,"asCubics":$full,"sums":$sums,"forEachCubic04":$forEach,""" +
        """"paths":$paths}"""
}

private fun rotated(p: RoundedPolygon, degrees: Float): RoundedPolygon {
    val r = Math.toRadians(degrees.toDouble())
    val c = cos(r).toFloat()
    val s = sin(r).toFloat()
    return p.transformed { x, y -> TransformResult(c * x - s * y, s * x + c * y) }
}

/** Fills a Compose path into a 64x64 mask with Java2D (no anti-aliasing), as hex rows. */
private fun raster(path: Path, size: Int): String {
    val shape = Path2D.Double(Path2D.WIND_NON_ZERO)
    for ((c, p) in path.commands) {
        val q = p.map { (it * size).toDouble() }
        when (c) {
            'M' -> shape.moveTo(q[0], q[1])
            'L' -> shape.lineTo(q[0], q[1])
            'C' -> shape.curveTo(q[0], q[1], q[2], q[3], q[4], q[5])
            'Z' -> shape.closePath()
        }
    }
    val img = BufferedImage(size, size, BufferedImage.TYPE_BYTE_GRAY)
    val g = img.createGraphics()
    g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_OFF)
    g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE)
    g.color = java.awt.Color.WHITE
    g.fill(shape)
    g.dispose()
    val sb = StringBuilder()
    for (y in 0 until size) {
        var bits = 0
        var n = 0
        for (x in 0 until size) {
            bits = (bits shl 1) or (if (img.raster.getSample(x, y, 0) > 127) 1 else 0)
            if (++n == 4) {
                sb.append("0123456789abcdef"[bits])
                bits = 0
                n = 0
            }
        }
    }
    return sb.toString()
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

    val r = { radius: Float, smoothing: Float -> CornerRounding(radius, smoothing) }
    // Pairs from Google's own morph and feature-mapping tests, a spread of
    // graphics-shapes polygons, and the morphs Compose builds itself.
    val cases = linkedMapOf<String, Triple<RoundedPolygon, RoundedPolygon, Float>>()
    val tri = RoundedPolygon(3, centerX = .5f, centerY = .5f)
    val sq = RoundedPolygon(4, centerX = .5f, centerY = .5f)
    cases["morphtest-triangle-square"] = Triple(tri, sq, 0f)
    cases["morphtest-triangle-triangle"] = Triple(tri, tri, 0f)
    cases["square-triangle"] = Triple(sq, tri, 0f)
    cases["rounded-triangles"] =
        Triple(RoundedPolygon(3, rounding = CornerRounding(0.2f)), RoundedPolygon(3), 0f)
    cases["checkmark-very-sunny"] =
        Triple(
            RoundedPolygon(
                    floatArrayOf(400f, -304f, 240f, -464f, 296f, -520f, 400f, -416f, 664f, -680f,
                        720f, -624f, 400f, -304f)
                )
                .normalized(),
            RoundedPolygon.star(8, innerRadius = .65f, rounding = CornerRounding(radius = .15f))
                .normalized(),
            0.5f,
        )
    cases["square-rotated-triangle"] = Triple(rotated(RoundedPolygon(4), 45f), RoundedPolygon(3), 0f)
    cases["hexagon-star8"] =
        Triple(
            RoundedPolygon(6, rounding = r(0.3f, 0.2f)),
            RoundedPolygon.star(8, innerRadius = 0.6f, rounding = r(0.1f, 0.5f)),
            0f,
        )
    cases["circle-star5"] = Triple(RoundedPolygon.circle(), RoundedPolygon.star(5), 0f)
    cases["rectangle-pill"] =
        Triple(RoundedPolygon.rectangle(2f, 1f, rounding = r(0.2f, 0f)), RoundedPolygon.pill(2f, 1f), 0f)
    cases["star12-circle8"] =
        Triple(
            RoundedPolygon.star(12, innerRadius = 0.7f, rounding = r(0.05f, 0f), innerRounding = r(0.1f, 0.3f)),
            RoundedPolygon.circle(8),
            0f,
        )
    cases["concave-square"] =
        Triple(
            RoundedPolygon(floatArrayOf(0f, 0f, 2f, 0f, 2f, 2f, 1f, 1f, 0f, 2f), rounding = r(0.3f, 0.4f)),
            RoundedPolygon.rectangle(2f, 2f, rounding = r(0.5f, 0.5f), centerX = 1f, centerY = 1f),
            0f,
        )
    cases["pillstar-circle"] =
        Triple(RoundedPolygon.pillStar(3f, 1f, numVerticesPerRadius = 10, innerRadiusRatio = 0.6f), RoundedPolygon.circle(6, 1.5f), 0f)
    cases["hourglass-square"] =
        Triple(
            RoundedPolygon(floatArrayOf(0f, 0f, 1f, 1f, -1f, 1f, 0f, 0f, -1f, -1f, 1f, -1f)),
            RoundedPolygon.rectangle(2f, 2f),
            0f,
        )
    // Compose LoadingIndicator: the indeterminate sequence, circular, normalized.
    val indeterminate = listOf(s.SoftBurst, s.Cookie9Sided, s.Pentagon, s.Pill, s.Sunny, s.Cookie4Sided, s.Oval)
    val names = listOf("SoftBurst", "Cookie9Sided", "Pentagon", "Pill", "Sunny", "Cookie4Sided", "Oval")
    for (i in indeterminate.indices) {
        val j = (i + 1) % indeterminate.size
        cases["loading-${names[i]}-${names[j]}"] =
            Triple(indeterminate[i].normalized(), indeterminate[j].normalized(), 0f)
    }
    // Compose LoadingIndicator: the determinate pair.
    cases["loading-determinate"] =
        Triple(
            s.Circle.transformed(Matrix().apply { rotateZ(360f / 20) }).normalized(),
            s.SoftBurst.normalized(),
            0f,
        )
    // A few more MaterialShapes pairs in full.
    for ((a, b) in listOf("Heart" to "Clover8Leaf", "Square" to "Circle", "PixelCircle" to "Burst",
        "Arrow" to "Fan", "Ghostish" to "Bun", "Triangle" to "PuffyDiamond", "Slanted" to "Arch")) {
        cases["material-$a-$b"] = Triple(all.getValue(a), all.getValue(b), 0.5f)
    }

    val sb = StringBuilder("{\n\"cases\":{\n")
    sb.append(
        cases.entries.joinToString(",\n") { (id, c) ->
            val body = try { caseJson(c.first, c.second, c.third) } catch (e: Exception) {
                """{"error":"${e.javaClass.simpleName}"}"""
            }
            "\"$id\":$body"
        }
    )
    sb.append("\n},\n\"matrix\":{\n")
    val rows = mutableListOf<String>()
    for ((a, pa) in all) for ((b, pb) in all) {
        val body = try {
            val morph = Morph(pa, pb)
            val m1 = MeasuredPolygon.measurePolygon(LengthMeasurer(), pa).features
                .filter { it.feature is androidx.graphics.shapes.Feature.Corner }
            val m2 = MeasuredPolygon.measurePolygon(LengthMeasurer(), pb).features
                .filter { it.feature is androidx.graphics.shapes.Feature.Corner }
            val firsts = morph.morphMatch.map { it.first }
            val seconds = morph.morphMatch.map { it.second }
            """{"n":${morph.morphMatch.size},"mapping":${mappingJson(doMapping(m1, m2))},""" +
                """"first":${checksum(firsts)},"second":${checksum(seconds)},""" +
                """"half":${checksum(morph.asCubics(0.5f))}}"""
        } catch (e: Exception) {
            """{"error":"${e.javaClass.simpleName}"}"""
        }
        rows.add("\"$a>$b\":$body")
    }
    sb.append(rows.joinToString(",\n"))
    sb.append("\n},\n\"raster\":{\n")
    val rasters = mutableListOf<String>()
    for ((id, c) in cases) {
        if (!id.startsWith("loading-") && !id.startsWith("material-")) continue
        val morph = Morph(c.first, c.second)
        for (pr in floatArrayOf(0f, 0.3f, 0.5f, 0.8f, 1f)) {
            rasters.add("\"$id@${pr.j()}\":\"${raster(morph.toPath(progress = pr, startAngle = 0), 64)}\"")
        }
    }
    sb.append(rasters.joinToString(",\n"))
    sb.append("\n}\n}\n")
    File(args[0]).writeText(sb.toString())
    println("wrote ${cases.size} morph cases, ${rows.size} matrix pairs, ${rasters.size} rasters to ${args[0]}")
}
