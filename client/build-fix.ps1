$env:GENERATE_SOURCEMAP=false
npm run build:prod
if ($LASTEXITCODE -ne 0) {
  Write-Host "Build failed with error $LASTEXITCODE"
  exit /b $LASTEXITCODE
} else {
  Write-Host "Build successful"
  exit /b 0
}
