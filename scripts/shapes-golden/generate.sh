#!/usr/bin/env bash
# Compiles Google's graphics-shapes sources (shapes and Morph) and MaterialShapes (extracted
# verbatim) and writes the reference JSON in packages/web/test/shapes/golden/.
#
# Needs a JDK and these jars in $KT_DEPS (all from Maven Central / Google Maven):
#   kotlin-compiler-embeddable-2.2.21, kotlin-stdlib-2.2.21, kotlin-script-runtime-2.2.21,
#   kotlin-reflect-1.6.10, kotlin-daemon-embeddable-2.2.21, kotlinx-coroutines-core-jvm-1.8.0,
#   trove4j-1.0.20200330, annotations-13.0, androidx collection-jvm-1.5.0, annotation-jvm-1.9.1
# and the androidx sources from `npm run tokens:fetch` (plus compose/ui/ui-graphics).
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${KT_DEPS:?set KT_DEPS to the folder with the jars}"
SRC=.cache/androidx/graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes
OUT=$(mktemp -d)
CP=$(ls "$KT_DEPS"/*.jar | tr '\n' ':')
LIBS="$KT_DEPS/kotlin-stdlib-2.2.21.jar:$KT_DEPS/collection-jvm-1.5.0.jar:$KT_DEPS/annotation-jvm-1.9.1.jar"
java -cp "$CP" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler -no-stdlib -no-reflect \
  -cp "$LIBS" -d "$OUT" \
  "$SRC"/{Point,Utils,Cubic,CornerRounding,Features,RoundedPolygon,Shapes}.kt scripts/shapes-golden/Golden.kt
mkdir -p packages/web/test/shapes/golden
java -cp "$OUT:$LIBS" androidx.graphics.shapes.GoldenKt packages/web/test/shapes/golden/graphics-shapes.json

# MaterialShapes: Google's class body and the Compose pieces it needs, extracted verbatim.
EXTRACT="$OUT/MaterialShapesExtract.kt"
node scripts/shapes-golden/extract-material-shapes.mjs .cache/androidx "$EXTRACT"
java -cp "$CP" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler -no-stdlib -no-reflect \
  -cp "$LIBS" -d "$OUT" \
  "$SRC"/{Point,Utils,Cubic,CornerRounding,Features,RoundedPolygon,Shapes}.kt \
  "$SRC"/{FloatMapping,PolygonMeasure,FeatureMapping,Morph}.kt scripts/shapes-golden/FormatJvm.kt \
  "$EXTRACT" scripts/shapes-golden/GoldenMaterialShapes.kt
java -cp "$OUT:$LIBS" androidx.compose.material3.GoldenMaterialShapesKt \
  packages/web/test/shapes/golden/material-shapes.json

# Morph: graphics-shapes' Morph, FeatureMapping, FloatMapping and PolygonMeasure,
# with MaterialShapes and Compose's Morph.toPath from the same extract (the
# extract includes Morph.toPath, so the MaterialShapes build above needs them too).
java -cp "$CP" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler -no-stdlib -no-reflect \
  -cp "$LIBS" -d "$OUT" \
  "$SRC"/{Point,Utils,Cubic,CornerRounding,Features,RoundedPolygon,Shapes}.kt \
  "$SRC"/{FloatMapping,PolygonMeasure,FeatureMapping,Morph}.kt scripts/shapes-golden/FormatJvm.kt \
  "$EXTRACT" scripts/shapes-golden/GoldenMorph.kt
java -cp "$OUT:$LIBS" androidx.compose.material3.GoldenMorphKt \
  packages/web/test/shapes/golden/morph.json
