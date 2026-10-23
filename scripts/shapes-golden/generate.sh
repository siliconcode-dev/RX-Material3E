#!/usr/bin/env bash
# Compiles Google's graphics-shapes sources with Golden.kt and writes
# packages/web/test/shapes/golden/graphics-shapes.json.
#
# Needs a JDK and these jars in $KT_DEPS (all from Maven Central / Google Maven):
#   kotlin-compiler-embeddable-2.2.21, kotlin-stdlib-2.2.21, kotlin-script-runtime-2.2.21,
#   kotlin-reflect-1.6.10, kotlin-daemon-embeddable-2.2.21, kotlinx-coroutines-core-jvm-1.8.0,
#   trove4j-1.0.20200330, annotations-13.0, androidx collection-jvm-1.5.0, annotation-jvm-1.9.1
# and the androidx sources from `npm run tokens:fetch`.
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
