# Script para reemplazar 'auth-token' por 'token' en todo el proyecto
# Guardar como: fix-auth-token.ps1
# Ejecutar con: .\fix-auth-token.ps1

$projectPath = "C:\Zethbeta1\new\src"

Write-Host "🔍 Buscando archivos con 'auth-token'..." -ForegroundColor Cyan

# Obtener todos los archivos que contienen 'auth-token'
$files = Get-ChildItem -Path $projectPath -Recurse -Include *.ts,*.tsx | 
    Where-Object { (Get-Content $_.FullName -Raw) -match "auth-token" }

Write-Host "📝 Encontrados $($files.Count) archivos para corregir" -ForegroundColor Yellow

$correctedCount = 0

foreach ($file in $files) {
    try {
        Write-Host "  Procesando: $($file.Name)" -ForegroundColor Gray
        
        # Leer contenido
        $content = Get-Content $file.FullName -Raw
        
        # Contar ocurrencias antes
        $beforeCount = ([regex]::Matches($content, "auth-token")).Count
        
        # Reemplazar 'auth-token' por 'token' (solo en localStorage/cookie contexts)
        $content = $content -replace "localStorage\.getItem\('auth-token'\)", "localStorage.getItem('token')"
        $content = $content -replace "localStorage\.setItem\('auth-token'", "localStorage.setItem('token'"
        $content = $content -replace "request\.cookies\.get\('auth-token'\)", "request.cookies.get('auth-token')"
        $content = $content -replace "response\.cookies\.set\('auth-token'", "response.cookies.set('auth-token'"
        
        # Contar ocurrencias después
        $afterCount = ([regex]::Matches($content, "auth-token")).Count
        
        # Solo guardar si hubo cambios en localStorage
        if ($beforeCount -ne $afterCount) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $correctedCount++
            Write-Host "    ✅ Corregido ($beforeCount → $afterCount ocurrencias restantes)" -ForegroundColor Green
        } else {
            Write-Host "    ⏭️  Sin cambios (solo cookies)" -ForegroundColor DarkGray
        }
        
    } catch {
        Write-Host "    ❌ Error: $_" -ForegroundColor Red
    }
}

Write-Host "`n✅ Proceso completado!" -ForegroundColor Green
Write-Host "📊 Archivos corregidos: $correctedCount de $($files.Count)" -ForegroundColor Cyan
Write-Host "`n⚠️  IMPORTANTE: Las cookies 'auth-token' se mantienen (son para el backend)" -ForegroundColor Yellow
Write-Host "💾 Solo se cambió localStorage de 'auth-token' a 'token'" -ForegroundColor Yellow
Write-Host "`n🔄 Ahora ejecuta:" -ForegroundColor Cyan
Write-Host "   1. npm run dev" -ForegroundColor White
Write-Host "   2. Recarga el navegador (Ctrl + Shift + R)" -ForegroundColor White
Write-Host "   3. Haz logout y login de nuevo" -ForegroundColor White