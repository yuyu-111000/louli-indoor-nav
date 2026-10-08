#!/bin/sh
cd "$(dirname "$0")"
{ printf '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'; cat louli-report.html; printf '\n</html>\n'; } > index.html
