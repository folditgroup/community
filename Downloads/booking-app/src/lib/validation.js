/**
 * Customer-input validation helpers.
 *
 * Філософія: відсіяти явне сміття ("asdf", "12345") але не вимагати
 * перфектний формат. Краще пропустити трохи нечіткого ніж заблочити реального клієнта.
 */

/**
 * Перевіряє ім'я.
 * Правила:
 *  - Мінімум 2 символи
 *  - Має містити хоч одну літеру
 *  - Не може бути ТІЛЬКИ цифрами
 *  - Має містити пробіл або бути довшим за 3 символи (одно-словні короткі прізвиська ОК)
 */
export function validateName(name) {
  const trimmed = (name || '').trim()
  if (trimmed.length < 2) return 'Please enter your name.'
  if (!/[a-zA-Zа-яА-ЯіІїЇєЄґҐ]/.test(trimmed)) return 'Name must contain letters.'
  if (/^\d+$/.test(trimmed)) return 'That doesn\'t look like a name.'
  // Якщо введено тільки одне слово коротше 3 символів — підозріло
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length === 1 && words[0].length < 3) return 'Please enter your full name.'
  return null  // OK
}

/**
 * Перевіряє телефон.
 * Правила:
 *  - Прибрати всі НЕ-цифри
 *  - Має бути 10-15 цифр (10 для US/CA, до 15 для міжнародних з кодом країни)
 *  - Перші не можуть бути всі однакові (1111111111)
 *  - Не може бути послідовністю (1234567890, 0123456789)
 */
export function validatePhone(phone) {
  const trimmed = (phone || '').trim()
  if (!trimmed) return 'Please enter your phone number.'

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 10) return 'Phone number is too short (10 digits expected).'
  if (digits.length > 15) return 'Phone number is too long.'

  // Усі однакові цифри
  if (/^(\d)\1+$/.test(digits)) return 'Please enter a real phone number.'

  // Прямі послідовності (sorted up або down)
  const isSequenceUp = digits.split('').every((d, i) => i === 0 || +d === +digits[i - 1] + 1)
  const isSequenceDown = digits.split('').every((d, i) => i === 0 || +d === +digits[i - 1] - 1)
  if (isSequenceUp || isSequenceDown) return 'Please enter a real phone number.'

  return null
}

/**
 * Форматує телефон для збереження.
 * Якщо 10 цифр — припускаємо US/CA, додаємо +1. Інакше зберігаємо як є з +.
 */
export function formatPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length > 10) return `+${digits}`
  return digits
}

/**
 * Display-форматування телефону.
 * +12035551234 → (203) 555-1234
 */
export function displayPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone || ''
}

/**
 * Перевіряє email.
 */
export function validateEmail(email, required = false) {
  const trimmed = (email || '').trim()
  if (!trimmed) return required ? 'Please enter your email.' : null
  // Standard email regex
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return 'Please enter a valid email.'
  return null
}

/**
 * Перевіряє адресу.
 * Правила:
 *  - Мінімум 5 символів
 *  - Має містити цифру (номер дому)
 *  - Має містити хоч 2 слова (вулиця + щось)
 */
export function validateAddress(address) {
  const trimmed = (address || '').trim()
  if (trimmed.length < 5) return 'Please enter your full address.'
  if (!/\d/.test(trimmed)) return 'Address should include a street number.'
  if (!/[a-zA-Zа-яА-ЯіІїЇєЄґҐ]/.test(trimmed)) return 'Address should include the street name.'
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length < 2) return 'Please include both street number and name.'
  return null
}
