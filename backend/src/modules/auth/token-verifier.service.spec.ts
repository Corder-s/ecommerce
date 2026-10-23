import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { generateKeyPair, SignJWT } from 'jose';
import { TokenVerificationService } from './token-verifier.service';

describe('TokenVerificationService (Cryptographic JWT / JWKS Verification)', () => {
  let service: TokenVerificationService;
  let validKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;
  let attackerKeyPair: Awaited<ReturnType<typeof generateKeyPair>>;

  const ISSUER = 'https://auth.gaushilp.example/';
  const AUDIENCE = 'gaushilp-api';

  beforeAll(async () => {
    // Generate isolated in-memory test key pairs
    validKeyPair = await generateKeyPair('RS256');
    attackerKeyPair = await generateKeyPair('RS256');
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              auth: {
                provider: 'oidc',
                issuerUrl: ISSUER,
                audience: AUDIENCE,
                jwksUrl: undefined,
              },
            }),
          ],
        }),
      ],
      providers: [TokenVerificationService],
    }).compile();

    service = module.get<TokenVerificationService>(TokenVerificationService);
    // Configure service with public key of validKeyPair for isolated verification
    service.setCustomKeyProvider(validKeyPair.publicKey);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fail if no JWKS or key provider is configured', async () => {
    service.setCustomKeyProvider(null);
    await expect(service.verifyToken('any.token.here')).rejects.toThrow(
      new UnauthorizedException(
        'Authentication provider is not yet configured with a valid JWKS endpoint. Set AUTH_JWKS_URL in environment configuration.',
      ),
    );
  });

  it('should successfully verify a valid JWT signed with trusted key', async () => {
    const token = await new SignJWT({
      sub: 'auth0|123456789',
      email: 'artisan@gaushilp.example',
      name: 'Ramesh Artisan',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('1h')
      .sign(validKeyPair.privateKey);

    const result = await service.verifyToken(token);

    expect(result).toBeDefined();
    expect(result.sub).toBe('auth0|123456789');
    expect(result.email).toBe('artisan@gaushilp.example');
    expect(result.name).toBe('Ramesh Artisan');
    expect(result.iss).toBe(ISSUER);
    expect(result.aud).toBe(AUDIENCE);
  });

  it('should reject a token with an invalid signature (attacker key)', async () => {
    const forgedToken = await new SignJWT({
      sub: 'auth0|attacker',
      email: 'attacker@example.com',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime('1h')
      .sign(attackerKeyPair.privateKey);

    await expect(service.verifyToken(forgedToken)).rejects.toThrow(
      new UnauthorizedException('Invalid token signature'),
    );
  });

  it('should reject an expired token', async () => {
    const expiredToken = await new SignJWT({
      sub: 'auth0|expired-user',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(validKeyPair.privateKey);

    await expect(service.verifyToken(expiredToken)).rejects.toThrow(
      new UnauthorizedException('Authentication token has expired'),
    );
  });

  it('should reject a token with incorrect issuer', async () => {
    const badIssuerToken = await new SignJWT({
      sub: 'auth0|bad-issuer',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer('https://malicious-issuer.example/')
      .setAudience(AUDIENCE)
      .setExpirationTime('1h')
      .sign(validKeyPair.privateKey);

    await expect(service.verifyToken(badIssuerToken)).rejects.toThrow(
      /Token claim validation failed for claim: iss/,
    );
  });

  it('should reject a token with incorrect audience', async () => {
    const badAudienceToken = await new SignJWT({
      sub: 'auth0|bad-audience',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience('wrong-audience')
      .setExpirationTime('1h')
      .sign(validKeyPair.privateKey);

    await expect(service.verifyToken(badAudienceToken)).rejects.toThrow(
      /Token claim validation failed for claim: aud/,
    );
  });

  it('should reject a malformed or corrupted token string', async () => {
    await expect(service.verifyToken('malformed.not-a-jwt.string')).rejects.toThrow(
      new UnauthorizedException('Malformed token structure'),
    );
  });
});
