import { TotpService } from './totp.service';

describe('TotpService', () => {
  const service = new TotpService();

  it('generates a base32 secret and an otpauth URI', () => {
    const secret = service.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    const uri = service.buildOtpAuthUrl('awa@test.com', 'PleasantStay', secret);
    expect(uri).toContain('otpauth://totp/PleasantStay:awa%40test.com');
    expect(uri).toContain(`secret=${secret}`);
  });

  it('verifies the current code and rejects wrong ones', async () => {
    const secret = service.generateSecret();
    const code = service.generateCode(secret);
    await expect(service.verify(code, secret)).resolves.toBe(true);
    const wrong = code === '000000' ? '111111' : '000000';
    await expect(service.verify(wrong, secret)).resolves.toBe(false);
  });

  it('rejects malformed input without throwing', async () => {
    await expect(service.verify('abc', 'SECRET')).resolves.toBe(false);
    await expect(service.verify('123456', '')).resolves.toBe(false);
    await expect(service.verify('123456', '!!not-base32!!')).resolves.toBe(
      false,
    );
  });
});
