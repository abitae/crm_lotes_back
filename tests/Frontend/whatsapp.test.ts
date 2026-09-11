import assert from 'node:assert/strict';
import test from 'node:test';
import { getWhatsAppUrl } from '../../resources/js/lib/whatsapp.ts';

test('adds the Peru country code to a local mobile number', () => {
    assert.equal(getWhatsAppUrl('924 103 931'), 'https://wa.me/51924103931');
});

test('preserves an international number and removes formatting', () => {
    assert.equal(
        getWhatsAppUrl('+51 (924) 103-931'),
        'https://wa.me/51924103931',
    );
});

test('does not create a WhatsApp link for an invalid phone number', () => {
    assert.equal(getWhatsAppUrl('12345'), null);
});
