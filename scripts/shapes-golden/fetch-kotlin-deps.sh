#!/usr/bin/env bash
# Downloads the jars generate.sh needs (Kotlin compiler and the libraries the
# compiled Google sources use) into the folder given, default .cache/kt-deps.
# Then: KT_DEPS=.cache/kt-deps ./scripts/shapes-golden/generate.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DIR="${1:-.cache/kt-deps}"
mkdir -p "$DIR"
CENTRAL=https://repo1.maven.org/maven2
GOOGLE=https://dl.google.com/android/maven2
for path in \
  "$CENTRAL/org/jetbrains/kotlin/kotlin-compiler-embeddable/2.2.21/kotlin-compiler-embeddable-2.2.21.jar" \
  "$CENTRAL/org/jetbrains/kotlin/kotlin-stdlib/2.2.21/kotlin-stdlib-2.2.21.jar" \
  "$CENTRAL/org/jetbrains/kotlin/kotlin-script-runtime/2.2.21/kotlin-script-runtime-2.2.21.jar" \
  "$CENTRAL/org/jetbrains/kotlin/kotlin-daemon-embeddable/2.2.21/kotlin-daemon-embeddable-2.2.21.jar" \
  "$CENTRAL/org/jetbrains/kotlin/kotlin-reflect/1.6.10/kotlin-reflect-1.6.10.jar" \
  "$CENTRAL/org/jetbrains/kotlinx/kotlinx-coroutines-core-jvm/1.8.0/kotlinx-coroutines-core-jvm-1.8.0.jar" \
  "$CENTRAL/org/jetbrains/intellij/deps/trove4j/1.0.20200330/trove4j-1.0.20200330.jar" \
  "$CENTRAL/org/jetbrains/annotations/13.0/annotations-13.0.jar" \
  "$GOOGLE/androidx/collection/collection-jvm/1.5.0/collection-jvm-1.5.0.jar" \
  "$GOOGLE/androidx/annotation/annotation-jvm/1.9.1/annotation-jvm-1.9.1.jar"; do
  file="$DIR/$(basename "$path")"
  [ -s "$file" ] || curl -fsSL -o "$file" "$path"
done
ls "$DIR"
