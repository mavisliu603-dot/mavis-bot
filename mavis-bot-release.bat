@echo off
REM =====================================================
REM 一键启动 Mavis AI Bot + GitHub Release 上传
REM =====================================================

REM --- 配置区 ---
set REPO_NAME=mavis-bot
set GITHUB_USER=你的GitHub用户名
set ZIP_FILE=mavis-bot.zip
set VERSION=v1.0
set RELEASE_TITLE=Mavis AI Sales Bot %VERSION%
set NODE_SCRIPT=index.js

REM --- 检查 Node.js 是否可用 ---
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js 未安装或未加入 PATH
    pause
    exit /b
)

REM --- 检查 Git 是否可用 ---
git --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ Git 未安装或未加入 PATH
    pause
    exit /b
)

REM --- 检查 GitHub CLI 是否可用 ---
gh --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ❌ GitHub CLI 未安装或未加入 PATH
    pause
    exit /b
)

REM --- 启动 WhatsApp AI Bot ---
echo ================================================
echo 📦 启动 Mavis AI Bot...
echo ================================================
start cmd /k "node %NODE_SCRIPT%"

REM --- 初始化 Git 仓库（如果第一次使用） ---
echo ================================================
echo 🌐 初始化 Git 仓库并推送到 GitHub...
echo ================================================
git init 2>nul
git add .
git commit -m "Auto commit for release %VERSION%" 2>nul

REM 添加远程仓库（如果未添加过）
git remote add origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git 2>nul
git branch -M main
git push -u origin main --force

REM --- 上传 Release ---
echo ================================================
echo 🏷 创建 GitHub Release 并上传压缩包...
echo ================================================
gh release create %VERSION% %ZIP_FILE% --title "%RELEASE_TITLE%" --notes "自动生成的发布包"

REM --- 输出下载链接 ---
set DOWNLOAD_LINK=https://github.com/%GITHUB_USER%/%REPO_NAME%/releases/download/%VERSION%/%ZIP_FILE%
echo ================================================
echo ✅ 完成！下载链接:
echo %DOWNLOAD_LINK%
echo ================================================
pause