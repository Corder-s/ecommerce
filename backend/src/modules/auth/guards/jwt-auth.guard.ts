import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '@prisma/client';
import { TokenVerificationService } from '../token-verifier.service';
import { IdentityService } from '../identity.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenVerifier: TokenVerificationService,
    private readonly identityService: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] as string | undefined;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [scheme, token] = authHeader.split(' ');

    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException(
        'Malformed Authorization header format. Expected "Bearer <token>"',
      );
    }

    // 1. Cryptographically verify JWT signature, issuer, audience, and expiration
    const verifiedPayload = await this.tokenVerifier.verifyToken(token.trim());

    // 2. Resolve external provider subject to platform User and active memberships
    const user = await this.identityService.resolveUserFromToken(verifiedPayload);

    // 3. Enforce user suspension
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException(
        'Your user account has been suspended by platform administration.',
      );
    }

    // 4. Attach authenticated user to request context
    request.user = user;

    return true;
  }
}
