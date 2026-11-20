param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Destination,
  [string]$Reference
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$destinationDirectory = Split-Path -Parent $Destination
New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null

$image = [System.Drawing.Image]::FromFile($Source)
$referenceImage = $null
$resizedImage = $null
try {
  $outputImage = $image
  if ($Reference) {
    $referenceImage = [System.Drawing.Image]::FromFile($Reference)
    if ($image.Width -ne $referenceImage.Width -or $image.Height -ne $referenceImage.Height) {
      $resizedImage = New-Object System.Drawing.Bitmap $referenceImage.Width, $referenceImage.Height
      $graphics = [System.Drawing.Graphics]::FromImage($resizedImage)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage($image, 0, 0, $referenceImage.Width, $referenceImage.Height)
      }
      finally {
        $graphics.Dispose()
      }
      $outputImage = $resizedImage
    }
  }

  $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object MimeType -eq 'image/jpeg'
  $encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality,
    94L
  )
  $outputImage.Save($Destination, $jpegCodec, $encoderParameters)
}
finally {
  if ($resizedImage) {
    $resizedImage.Dispose()
  }
  if ($referenceImage) {
    $referenceImage.Dispose()
  }
  $image.Dispose()
}

$savedImage = [System.Drawing.Image]::FromFile($Destination)
try {
  if ($savedImage.Width -lt 500 -or $savedImage.Height -lt 500) {
    throw "Generated image is unexpectedly small: $($savedImage.Width)x$($savedImage.Height)"
  }
}
finally {
  $savedImage.Dispose()
}
