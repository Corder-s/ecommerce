import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  jwtVerify,
  createRemoteJWKSet,
  JWTVerifyGetKey,
  KeyLike,
  errors as joseErrors,
} from 'jose';
import { VerifiedTokenPayload } from './interfaces/auth.interface';

@Injectable()
export class TokenVerificationService {
  private readonly logger = new Logger(TokenVerificationService.name);
  private remoteJwkSet: JWTVerifyGetKey | null = null;
  private customKeyProvider: JWTVerifyGetKey | KeyLike | Uint8Array | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeJwks();
  }

  private initializeJwks() {
    const jwksUrl = this.configService.get<string>('auth.jwksUrl');
    if (jwksUrl) {
      try {
        this.remoteJwkSet = createRemoteJWKSet(new URL(jwksUrl), {
          cacheMaxAge: 600000, // 10 minutes
          cooldownDuration: 30000, // 30 seconds
        });
        this.logger.log(`Initialized remote JWKS client for URL: ${jwksUrl}`);
      } catch (err) {
        this.logger.error(`Failed to initialize remote JWKS for URL: ${jwksUrl}`, err);
      }
    }
  }

  /**
   * Allows setting a custom key or JWKS provider (primarily for automated testing
   * or hybrid provider integration without making outbound network requests).
   */
  setCustomKeyProvider(provider: JWTVerifyGetKey | KeyLike | Uint8Array | null) {
    this.customKeyProvider = provider;
  }

  /**
   * Cryptographically verifies a JWT signature and required claims (exp, iss, aud).
   * Never trusts unverified claims or decodes without cryptographic proof.
   */
  async verifyToken(token: string): Promise<VerifiedTokenPayload> {
    const key = this.customKeyProvider || this.remoteJwkSet;

    if (!key) {
      throw new UnauthorizedException(
        'Authentication provider is not yet configured with a valid JWKS endpoint. Set AUTH_JWKS_URL in environment configuration.',
      );
    }

    const expectedIssuer = this.configService.get<string>('auth.issuerUrl');
    const expectedAudience = this.configService.get<string>('auth.audience');

    try {
      const { payload } = await jwtVerify(token, key as any, {
        issuer: expectedIssuer || undefined,
        audience: expectedAudience || undefined,
        algorithms: ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'EdDSA'],
        clockTolerance: 5, // 5 seconds clock drift allowance
      });

      if (!payload.sub) {
        throw new UnauthorizedException('Token payload is missing subject claim (sub)');
      }

      return {
        sub: payload.sub,
        iss: payload.iss,
        aud: payload.aud,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        name: typeof payload.name === 'string' ? payload.name : undefined,
        ...payload,
      };
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      if (err instanceof joseErrors.JWTExpired) {
        throw new UnauthorizedException('Authentication token has expired');
      }

      if (err instanceof joseErrors.JWTClaimValidationFailed) {
        throw new UnauthorizedException(
          `Token claim validation failed for claim: ${err.claim} (reason: ${err.reason})`,
        );
      }

      if (err instanceof joseErrors.JWSSignatureVerificationFailed) {
        throw new UnauthorizedException('Invalid token signature');
      }

      if (err instanceof joseErrors.JWSInvalid) {
        throw new UnauthorizedException('Malformed token structure');
      }

      this.logger.warn(
        `JWT verification error: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Invalid or untrusted authentication token');
    }
  }
}
