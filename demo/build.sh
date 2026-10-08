#!/bin/sh
cd "$(dirname "$0")"
# The standalone build links the report next to it instead of the hosted copy.
{ printf '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'; sed 's#https://claude.ai/artifact/VFD9xvursQiJiP7yrPerRz#../report/index.html#' louli.html; printf '\n</html>\n'; } > index.html
