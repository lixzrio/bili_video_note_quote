# 启动Edge浏览器并打开扩展管理页面的PowerShell脚本
Write-Host "正在启动Edge浏览器并打开扩展管理页面..."

# 使用Start-Process启动Edge浏览器并访问扩展管理页面
Start-Process microsoft-edge:edge://extensions/

# 显示提示信息
Write-Host "==========================================="
Write-Host "Edge浏览器扩展管理页面已打开"
Write-Host "请按照以下步骤操作："
Write-Host "1. 在扩展管理页面右上角，启用'开发者模式'开关"
Write-Host "2. 点击'加载已解压的扩展'按钮"
Write-Host "3. 选择插件文件夹: d:\Cray\bili_video_note_quote"
Write-Host "4. 点击'选择文件夹'完成安装"
Write-Host "==========================================="
Write-Host "提示：详细安装步骤请参阅 'Edge安装指南.md' 文件"

# 暂停脚本，让用户看到提示信息
Write-Host "按任意键继续..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
