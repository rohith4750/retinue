/**
 * Convert amount (number) to words for Indian Rupees - used in Tax Invoice PDF.
 * Handles whole numbers up to 99,99,99,999 (crores).
 */
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']

function twoDigits(n: number): string {
  if (n < 10) return ones[n]
  if (n < 20) return teens[n - 10]
  const t = Math.floor(n / 10)
  const o = n % 10
  return tens[t] + (o ? ' ' + ones[o] : '')
}

function threeDigits(n: number): string {
  if (n === 0) return ''
  const h = Math.floor(n / 100)
  const rest = n % 100
  const part = twoDigits(rest)
  if (h === 0) return part
  return ones[h] + ' Hundred' + (part ? ' ' + part : '')
}

export function amountInWords(amount: number): string {
  const whole = Math.floor(amount)
  if (whole === 0) return 'Zero Rupees only'
  const crores = Math.floor(whole / 1_00_00_000)
  const lakhs = Math.floor((whole % 1_00_00_000) / 1_00_000)
  const thousands = Math.floor((whole % 1_00_000) / 1000)
  const rest = whole % 1000
  const parts: string[] = []
  if (crores) parts.push(threeDigits(crores) + ' Crore' + (crores !== 1 ? 's' : ''))
  if (lakhs) parts.push(threeDigits(lakhs) + ' Lakh' + (lakhs !== 1 ? 's' : ''))
  if (thousands) parts.push(threeDigits(thousands) + ' Thousand')
  if (rest) parts.push(threeDigits(rest))
  return (parts.join(' ') || 'Zero') + ' Rupees only'
}
