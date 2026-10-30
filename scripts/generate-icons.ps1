Add-Type -AssemblyName System.Drawing

$srcPath = (Resolve-Path "public/logo-gestao360.png").Path
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)

$c0 = $bmp.GetPixel(0,0)
$cMid = $bmp.GetPixel([int]($bmp.Width/2), [int]($bmp.Height/2))

Write-Host "Corner: R=$($c0.R), G=$($c0.G), B=$($c0.B), A=$($c0.A)"
Write-Host "Center: R=$($cMid.R), G=$($cMid.G), B=$($cMid.B), A=$($cMid.A)"

function Resize-Image($source, $width, $height, $targetPath) {
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $destImage = New-Object System.Drawing.Bitmap($width, $height)
    $destImage.SetResolution($source.HorizontalResolution, $source.VerticalResolution)

    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $graphics.DrawImage($source, $destRect, 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    $destImage.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destImage.Dispose()
    Write-Host "Generated $targetPath ($width x $height)"
}

Resize-Image $bmp 512 512 "public/pwa-512x512.png"
Resize-Image $bmp 192 192 "public/pwa-192x192.png"
Resize-Image $bmp 180 180 "public/apple-touch-icon.png"
Resize-Image $bmp 64 64 "public/favicon-64x64.png"
Resize-Image $bmp 32 32 "public/favicon-32x32.png"
Resize-Image $bmp 16 16 "public/favicon-16x16.png"

# Also save a 512x512 maskable icon with a small safe-area padding
$maskSize = 512
$maskDest = New-Object System.Drawing.Bitmap($maskSize, $maskSize)
$maskG = [System.Drawing.Graphics]::FromImage($maskDest)
$maskG.Clear([System.Drawing.Color]::FromArgb(10, 10, 10)) # dark background matching logo
$maskG.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$maskG.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$maskG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
# 80% safe zone for maskable icon
$padding = [int]($maskSize * 0.1)
$innerSize = $maskSize - (2 * $padding)
$maskG.DrawImage($bmp, $padding, $padding, $innerSize, $innerSize)
$maskG.Dispose()
$maskDest.Save("public/pwa-maskable-512x512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$maskDest.Dispose()
Write-Host "Generated public/pwa-maskable-512x512.png (512 x 512 maskable)"

$bmp.Dispose()

