Add-Type -AssemblyName System.Speech

function Generate-Voiceover($voiceName, $outputPath) {
    Write-Host "Generating audio with voice: $voiceName..."
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.SelectVoice($voiceName)
    $synth.Rate = 0  # Normal conversational pace

    $synth.SetOutputToWaveFile($outputPath)

    $builder = New-Object System.Speech.Synthesis.PromptBuilder

    # Intro
    $builder.AppendText("Welcome to the official demonstration of TipidLink: an intelligent, shared family financial management platform designed specifically for Filipino households, developed for ITPC113 Technopreneurship, and evaluated under the ISO/IEC 25010 software quality standards.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(2.5))

    # The Problem & Shared Household
    $builder.AppendText("Many Filipino families face financial stress due to uncoordinated spending, lost physical receipts, and forgotten utility due dates. TipidLink solves this by connecting all household members into one synchronized digital wallet.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(2.0))

    # Step 1: Household Collaboration & Invite Code
    $builder.AppendText("Here in the Household module, we see the Santos Family. Nanay Maria serves as the Household Owner and Budget Manager. Tatay Juan is the Admin and primary breadwinner. And daughter Angela is a working student. Every family member connects their personal smartphone to this shared wallet using the unique household invite code: SANTOS 2026. Data privacy is strictly enforced at the database level using PostgreSQL Row Level Security, ensuring complete household confidentiality.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(2.5))

    # Step 2: Consolidated Multi-Earner Dashboard
    $builder.AppendText("Next, on the Executive Dashboard, earnings from all household contributors are consolidated automatically. Tatay Juan's payroll salary of 48,000 pesos, Angela's online freelance tutorials of 14,500 pesos, and Nanay Maria's sari-sari store income of 8,500 pesos combine into a total monthly income of 71,000 pesos. Subtracting 19,700 pesos in family expenses, the household maintains a positive net savings of 51,300 pesos. The monthly budget target bar reflects 30.3 percent utilization against their 65,000 peso limit.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(2.5))

    # Step 3: Shared Transactions & Member Attribution
    $builder.AppendText("Moving to the Shared Transactions engine, every recorded entry displays a clear member attribution tag. We can see the bi-weekly groceries logged by Maria via GCash, the electric bill logged by Juan via Maya, and Angela's freelance deposit. Real-time calculations execute with sub-50 millisecond responsiveness, eliminating missing receipts and promoting complete financial transparency.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(2.5))

    # Step 4: Proactive Budget Ceilings
    $builder.AppendText("In the Budgets module, category ceilings are visually monitored to prevent overspending. Color-coded progress indicators remain green below 80 percent, turn amber when nearing limits as seen in the electricity budget at 93 percent, and turn red when exceeded. This provides proactive user error protection for the entire family.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(2.5))

    # Step 5: Bills & Partial Payments Reconciliation
    $builder.AppendText("A standout feature of TipidLink is the Bills module with partial payment reconciliation. Filipino households often pay large obligations in installments. For example, Angela's university tuition of 8,000 pesos shows a 4,000 peso partial payment, with the system accurately tracking the remaining 4,000 peso balance and highlighting overdue warnings to protect the family from penalty fees.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(2.5))

    # Step 6: Shared Savings & Milestones
    $builder.AppendText("In the Savings module, the family tracks long-term goals together. The Family Emergency Fund, or Pondong Pang-ipit, is 68.5 percent funded. Additionally, their shared goal for an Inverter Refrigerator Upgrade is 100 percent completed with 28,000 pesos saved, ready for purchase.")
    $builder.AppendBreak([TimeSpan]::FromSeconds(2.5))

    # Step 7: Universal PDF Export & ISO Verification
    $builder.AppendText("Finally, TipidLink features a Universal 1-Tap PDF Action Sheet. Instead of cumbersome spreadsheets, families can instantly preview, download, or print audit-ready financial statements across Android, iOS, and PC. Verified through 16 automated integration tests and evaluated under ISO/IEC 25010 with an overall rating of 4.86 Excellent, TipidLink is production-ready for Filipino families. Thank you very much.")

    $synth.Speak($builder)
    $synth.Dispose()
    Write-Host "Audio generated successfully at: $outputPath"
}

# Generate both female and male voice options
$dest1 = "c:\Users\HUAWEI\Downloads\TipidLink-Presentation-Voiceover-Female.wav"
$dest2 = "c:\Users\HUAWEI\Downloads\TipidLink-Presentation-Voiceover-Male.wav"
$destPublic = "C:\Users\HUAWEI\Downloads\113antygravity\public\TipidLink-Presentation-Voiceover.wav"

Generate-Voiceover "Microsoft Zira Desktop" $dest1
Generate-Voiceover "Microsoft David Desktop" $dest2
Copy-Item $dest1 -Destination $destPublic -Force

Write-Host "All voiceover audio files generated successfully!"
