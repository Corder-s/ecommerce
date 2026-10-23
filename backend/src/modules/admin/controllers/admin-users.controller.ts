import { Controller, Get, Patch, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PlatformRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformRolesGuard } from '../../auth/guards/platform-roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/auth.interface';
import { AdminUsersService } from '../services/admin-users.service';
import { UserQueryDto } from '../dto/user-query.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { Request } from 'express';

@ApiTags('Super Admin — Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformRolesGuard)
@Roles(PlatformRole.SUPER_ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List platform users with pagination and search' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN role' })
  async listUsers(@Query() query: UserQueryDto) {
    return this.adminUsersService.listUsers(query);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user account details, memberships, and profile' })
  @ApiParam({ name: 'userId', description: 'User unique identifier (UUID)' })
  @ApiResponse({ status: 200, description: 'User account details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Param('userId') userId: string) {
    return this.adminUsersService.getUserDetails(userId);
  }

  @Patch(':userId/status')
  @ApiOperation({
    summary: 'Disable or reactivate a user account with self-lockout protection',
  })
  @ApiParam({ name: 'userId', description: 'User unique identifier (UUID)' })
  @ApiResponse({ status: 200, description: 'User status successfully updated' })
  @ApiResponse({ status: 400, description: 'Self-lockout attempt or invalid transition' })
  @ApiResponse({ status: 403, description: 'Cannot suspend a Super Admin' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip;
    const userAgent = req.headers['user-agent'];

    return this.adminUsersService.updateUserStatus(user, targetUserId, dto, {
      ipAddress,
      userAgent,
    });
  }
}
