$speak = New-Object -ComObject SAPI.SpVoice
$stream = New-Object -ComObject SAPI.SpFileStream
$stream.Open("test_audio.wav", 3, $false)
$speak.AudioOutputStream = $stream
$speak.Speak("Hello, this is a test of the karaoke video generator.")
$stream.Close()

ffmpeg -f lavfi -i color=c=blue:s=1280x720:d=6 -i test_audio.wav -pix_fmt yuv420p -y test_input.mp4
if (Test-Path test_audio.wav) {
    Remove-Item test_audio.wav
}
