Add-Type -AssemblyName System.Speech

function Generate-Voiceover($voiceName, $outputPath) {
    Write-Host "Generating 2:30 audio with voice: $voiceName..."
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.SelectVoice($voiceName)
    $synth.Rate = 0  # Natural conversational pace

    $synth.SetOutputToWaveFile($outputPath)

    $builder = New-Object System.Speech.Synthesis.PromptBuilder

    # 1. Simple direct intro (No subject name/course code) - ~15s
    $builder.AppendText("Welcome to TipidLink: a smart, shared family budget management platform designed for Filipino households. As you save, life becomes more comfortable.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(1.0))

    # 2. Shared Family Household & Invite Code - ~20s
    $builder.AppendText("In the Household module, we see the Santos Family. Nanay Maria is the Budget Manager and Owner, Tatay Juan is the primary breadwinner, and Angela is a working student. Every member connects their phone to this shared wallet using invite code: SANTOS 2026, protected by secure row level security.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(1.0))

    # 3. Consolidated Multi-Earner Dashboard - ~25s
    $builder.AppendText("On the Executive Dashboard, multi-earner income is consolidated in real time. Juan's salary of 48,000 pesos, Angela's freelance tutorials of 14,500 pesos, and Maria's store income of 8,500 pesos combine into 71,000 pesos Total Income. Subtracting 19,700 pesos in expenses leaves a positive net savings of 51,300 pesos, with 30.3 percent budget utilization.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(1.0))

    # 4. Shared Transactions & Member Attribution - ~20s
    $builder.AppendText("In Shared Transactions, every entry shows who logged it, such as Maria's groceries via GCash, or Juan's electric bill via Maya. This provides complete family transparency with instant calculations.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(1.0))

    # 5. Proactive Budget Limits & Color Warnings - ~20s
    $builder.AppendText("In the Budgets module, category ceilings keep spending under control. Progress bars stay green below 80 percent, turn amber when nearing limits like electricity at 93 percent, and turn red when exceeded, preventing family overspending.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(1.0))

    # 6. Shared Bills & Partial Payments - ~20s
    $builder.AppendText("For household bills, TipidLink uniquely supports partial payments. Angela's university tuition of 8,000 pesos shows a 4,000 peso partial payment, with the system accurately tracking the remaining balance and warning against overdue penalties.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(1.0))

    # 7. Shared Savings & Completed Milestones - ~15s
    $builder.AppendText("In the Savings module, the family tracks their shared Emergency Fund, or Pondong Pang-ipit, while celebrating completed milestones like their Inverter Refrigerator upgrade, fully funded at 28,000 pesos.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(1.0))

    # 8. Universal 1-Tap PDF Export & Wrap-up - ~15s
    $builder.AppendText("Finally, TipidLink features a Universal 1-Tap PDF Action Sheet for instant statements on Android, iOS, and PC. Verified with 16 automated tests and rated Excellent under ISO/IEC 25010. Thank you for watching.")

    $synth.Speak($builder)
    $synth.Dispose()

    # Calculate exact duration
    $fileStream = [System.IO.File]::OpenRead($outputPath)
    $seconds = $fileStream.Length / 44100
    $fileStream.Close()

    $mins = [Math]::Floor($seconds / 60)
    $secs = [Math]::Round($seconds % 60)
    Write-Host "Audio generated successfully at: $outputPath (Duration: $mins mins $secs secs / Total: $([Math]::Round($seconds, 1))s)"
}

$dest1 = "c:\Users\HUAWEI\Downloads\TipidLink-Presentation-Voiceover-Female.wav"
$dest2 = "c:\Users\HUAWEI\Downloads\TipidLink-Presentation-Voiceover-Male.wav"
$destPublic = "C:\Users\HUAWEI\Downloads\113antygravity\public\TipidLink-Presentation-Voiceover.wav"

Generate-Voiceover "Microsoft Zira Desktop" $dest1
Generate-Voiceover "Microsoft David Desktop" $dest2
Copy-Item $dest1 -Destination $destPublic -Force

Write-Host "Both 2:30 voiceover files updated successfully!"
