import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser, VerifiedTokenPayload } from './interfaces/auth.interface';
import { PlatformRole } from '@prisma/client';

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Resolves a verified external provider subject (sub) to a local User and its memberships.
   * Identifies users through the verified provider subject, NOT by untrusted email matching.
   */
  async resolveUserFromToken(payload: VerifiedTokenPayload): Promise<AuthenticatedUser> {
    const provider = this.configService.get<string>('auth.provider') || 'oidc';
    const providerSubject = payload.sub;

    if (!providerSubject) {
      throw new UnauthorizedException('Authentication token is missing a subject identifier (sub)');
    }

    // 1. Look up existing external identity mapping
    const existingIdentity = await this.prisma.userIdentity.findUnique({
      where: {
        provider_providerSubject: {
          provider,
          providerSubject,
        },
      },
      include: {
        user: {
          include: {
            memberships: {
              where: { status: 'ACTIVE' },
              include: {
                tenant: {
                  select: { status: true },
                },
              },
            },
          },
        },
      },
    });

    if (existingIdentity && existingIdentity.user) {
      const { user } = existingIdentity;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        platformRole: user.platformRole,
        status: user.status,
        memberships: user.memberships.map((m: any) => ({
          id: m.id,
          tenantId: m.tenantId,
          role: m.role,
          status: m.status,
          tenantStatus: m.tenant?.status,
        })),
      };
    }

    // 2. First-time login: Provision a new User and link UserIdentity atomically
    const email = payload.email?.toLowerCase().trim();
    const name = payload.name || (email ? email.split('@')[0] : 'GauShilp User');

    // Safe fallback email if provider did not include an email claim
    const finalEmail = email || `${providerSubject}@auth.${provider}.local`;

    try {
      const newUser = await this.prisma.$transaction(async (tx) => {
        // Prevent identity hijacking: if an account with this email exists with a DIFFERENT identity, reject
        const existingEmailUser = await tx.user.findUnique({
          where: { email: finalEmail },
          include: { identities: true },
        });

        if (existingEmailUser) {
          if (existingEmailUser.identities.length > 0) {
            throw new UnauthorizedException(
              'An account with this email is already linked to another external identity provider.',
            );
          }

          // Link verified identity to the existing unlinked user account
          await tx.userIdentity.create({
            data: {
              userId: existingEmailUser.id,
              provider,
              providerSubject,
              email: finalEmail,
            },
          });

          return existingEmailUser;
        }

        // Create new user (ALWAYS default to standard USER role; NEVER grant SUPER_ADMIN on registration)
        const createdUser = await tx.user.create({
          data: {
            name,
            email: finalEmail,
            platformRole: PlatformRole.USER,
          },
        });

        await tx.userIdentity.create({
          data: {
            userId: createdUser.id,
            provider,
            providerSubject,
            email: finalEmail,
          },
        });

        return createdUser;
      });

      this.logger.log(
        `Provisioned new user identity for subject: [${provider}:${providerSubject}] -> User ID: ${newUser.id}`,
      );

      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        platformRole: newUser.platformRole,
        status: newUser.status,
        memberships: [],
      };
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error(`Error provisioning user identity for ${providerSubject}:`, err);
      throw new UnauthorizedException('Could not resolve or provision user identity');
    }
  }
}
