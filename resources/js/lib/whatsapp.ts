export function getWhatsAppUrl(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');

    if (digits.length < 9) {
        return null;
    }

    const internationalNumber = digits.length === 9 ? `51${digits}` : digits;

    return `https://wa.me/${internationalNumber}`;
}
