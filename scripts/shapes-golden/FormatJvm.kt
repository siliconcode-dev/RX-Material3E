// The JVM `actual` of graphics-shapes Format.kt (Format.jvmAndAndroid.kt), as a
// plain function: this build compiles common sources without multiplatform mode.
package androidx.graphics.shapes

internal fun Float.toStringWithLessPrecision(): String {
    return "%.3f".format(this)
}
