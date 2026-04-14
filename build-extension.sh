#!/bin/bash

# 构建打包脚本 - Chrome 扩展
EXTENSION_DIR="chrome-extension"
OUTPUT_DIR="dist"
VERSION="1.0.0"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 打包为 zip
cd "$EXTENSION_DIR"
zip -r "../$OUTPUT_DIR/alibaba-inquiry-extension-v$VERSION.zip" .
cd ..

echo "✓ 扩展已打包到 $OUTPUT_DIR/alibaba-inquiry-extension-v$VERSION.zip"
