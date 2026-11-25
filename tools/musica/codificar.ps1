# Convierte WAV a M4A (AAC) con el codificador que trae Windows: no hace falta instalar nada.
# Lo llama tools/musica.mjs: codificar.ps1 -Origen carpeta-con-wav -Destino carpeta -Kbps 128
param([string]$Origen, [string]$Destino, [uint32]$Kbps = 128)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Media.Transcoding.MediaTranscoder, Windows.Media, ContentType = WindowsRuntime]
[void][Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
$asAction = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1'
} | Select-Object -First 1
function Wait-Result($operation, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
  $task.Wait()
  $task.Result
}
$folder = Wait-Result ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($Destino)) ([Windows.Storage.StorageFolder])
foreach ($wav in Get-ChildItem -LiteralPath $Origen -Filter *.wav) {
  $source = Wait-Result ([Windows.Storage.StorageFile]::GetFileFromPathAsync($wav.FullName)) ([Windows.Storage.StorageFile])
  $target = Wait-Result ($folder.CreateFileAsync($wav.BaseName + '.m4a', [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
  $format = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateM4a([Windows.Media.MediaProperties.AudioEncodingQuality]::High)
  $format.Audio.SampleRate = 44100
  $format.Audio.ChannelCount = 2
  $format.Audio.Bitrate = $Kbps * 1000
  $transcoder = New-Object Windows.Media.Transcoding.MediaTranscoder
  $ready = Wait-Result ($transcoder.PrepareFileTranscodeAsync($source, $target, $format)) ([Windows.Media.Transcoding.PrepareTranscodeResult])
  if (-not $ready.CanTranscode) { throw "No se pudo convertir $($wav.Name): $($ready.FailureReason)" }
  $asAction.MakeGenericMethod([double]).Invoke($null, @($ready.TranscodeAsync())).Wait()
}
