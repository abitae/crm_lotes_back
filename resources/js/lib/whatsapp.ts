export function getWhatsAppUrl(phone: string | null | undefined): string | null {
    if (!phone) {
        return null;
    }

    const digits = phone.replace(/\D/g, '');

    if (digits.length < 9) {
        return null;
    }

    const internationalNumber = digits.length === 9 ? `51${digits}` : digits;

    return `https://wa.me/${internationalNumber}`;
}
