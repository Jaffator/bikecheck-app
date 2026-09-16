import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

// A verification token is signed with the same secret as an access token, so the signature
// check alone would let one open a session. The purpose claim is what keeps it out.
describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    process.env['JWT_SECRET'] = 'test-secret';
    strategy = new JwtStrategy();
  });

  it('opens a session for an access token', () => {
    expect(strategy.validate({ sub: 7, email: 'rider@example.com' })).toEqual({
      userId: 7,
      email: 'rider@example.com',
    });
  });

  it('refuses a payload carrying a purpose - a verification token is not an access token', () => {
    expect(() => strategy.validate({ sub: 7, email: 'rider@example.com', purpose: 'email_verification' })).toThrow(
      UnauthorizedException,
    );
  });

  it('refuses any purpose, not only the one it knows', () => {
    expect(() => strategy.validate({ sub: 7, email: 'rider@example.com', purpose: 'anything' })).toThrow(
      UnauthorizedException,
    );
  });
});
