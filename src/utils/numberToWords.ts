const LESS_THAN_TWENTY = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
  'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN',
  'EIGHTEEN', 'NINETEEN',
];

const TENS = [
  '', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY',
];

const THOUSANDS = ['', 'THOUSAND', 'MILLION', 'BILLION'];

function convertHundreds(num: number): string {
  let result = '';
  if (num >= 100) {
    result += LESS_THAN_TWENTY[Math.floor(num / 100)] + ' HUNDRED';
    num %= 100;
  }
  if (num >= 20) {
    result += (result ? ' ' : '') + TENS[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) {
      result += '-' + LESS_THAN_TWENTY[num];
    }
  } else if (num > 0) {
    result += (result ? ' ' : '') + LESS_THAN_TWENTY[num];
  }
  return result;
}

export function numberToWordsCDF(amount: number): string {
  if (amount <= 0) return 'ZERO CDF';
  let abs = Math.abs(Math.round(amount));
  let words = '';
  let thousandIndex = 0;

  while (abs > 0) {
    const chunk = abs % 1000;
    if (chunk > 0) {
      words = convertHundreds(chunk) + (THOUSANDS[thousandIndex] ? ' ' + THOUSANDS[thousandIndex] : '') + ' ' + words;
    }
    abs = Math.floor(abs / 1000);
    thousandIndex++;
  }

  return words.trim().replace(/\s+/g, ' ') + ' CDF';
}
