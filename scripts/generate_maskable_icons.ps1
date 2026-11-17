Add-Type -AssemblyName System.Drawing
$pwd = Get-Location
$srcImg = [System.Drawing.Image]::FromFile("$pwd\public\tipidlink-logo.png")

function Create-Maskable($sz, $out) {
    $bmp = New-Object System.Drawing.Bitmap $sz, $sz
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#059669'))
    $g.FillRectangle($bgBrush, 0, 0, $sz, $sz)

    $inner = [int]($sz * 0.72)
    $pad = [int](($sz - $inner) / 2)
    $g.DrawImage($srcImg, $pad, $pad, $inner, $inner)

    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $bgBrush.Dispose()
}

Create-Maskable 192 "$pwd\public\icon-maskable-192.png"
Create-Maskable 512 "$pwd\public\icon-maskable-512.png"
$srcImg.Dispose()
Write-Output "DONE"
