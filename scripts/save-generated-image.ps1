param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Destination
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$destinationDirectory = Split-Path -Parent $Destination
New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null

$image = [System.Drawing.Image]::FromFile($Source)
try {
  $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object MimeType -eq 'image/jpeg'
  $encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality,
    94L
  )
  $image.Save($Destination, $jpegCodec, $encoderParameters)
}
finally {
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
