import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { CustomerProfileService } from './services/customer-profile.service';
import { CustomerAddressesService } from './services/customer-addresses.service';
import { CustomerWishlistService } from './services/customer-wishlist.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistQueryDto } from './dto/wishlist-query.dto';

@ApiTags('Customer Account')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers/me')
export class CustomersController {
  constructor(
    private readonly profileService: CustomerProfileService,
    private readonly addressesService: CustomerAddressesService,
    private readonly wishlistService: CustomerWishlistService,
  ) {}

  // ===========================================================================
  // A. Customer Profile Endpoints
  // ===========================================================================

  @Get()
  @ApiOperation({ summary: "Retrieve authenticated customer's profile & account details" })
  @ApiResponse({ status: 200, description: 'Customer profile details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.id);
  }

  @Patch()
  @ApiOperation({ summary: "Update authenticated customer's profile and account settings" })
  @ApiResponse({ status: 200, description: 'Updated customer profile' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, dto);
  }

  // ===========================================================================
  // B. Saved Addresses Endpoints
  // ===========================================================================

  @Get('addresses')
  @ApiOperation({ summary: 'List all saved delivery addresses for the authenticated customer' })
  @ApiResponse({ status: 200, description: 'List of saved addresses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.listAddresses(user.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Create a new saved delivery address' })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid address payload or postal code' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createAddress(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAddressDto) {
    return this.addressesService.createAddress(user.id, dto);
  }

  @Patch('addresses/:addressId')
  @ApiOperation({ summary: 'Update an existing saved delivery address' })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  @ApiResponse({ status: 404, description: 'Address not found or unauthorized' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.updateAddress(user.id, addressId, dto);
  }

  @Delete('addresses/:addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a saved delivery address' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 404, description: 'Address not found or unauthorized' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId') addressId: string,
  ) {
    return this.addressesService.deleteAddress(user.id, addressId);
  }

  @Patch('addresses/:addressId/default')
  @ApiOperation({ summary: 'Set a saved address as the default delivery address' })
  @ApiResponse({ status: 200, description: 'Address set as default' })
  @ApiResponse({ status: 404, description: 'Address not found or unauthorized' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setDefaultAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId') addressId: string,
  ) {
    return this.addressesService.setDefaultAddress(user.id, addressId);
  }

  // ===========================================================================
  // C. Wishlist Endpoints
  // ===========================================================================

  @Get('wishlist')
  @ApiOperation({
    summary: "List authenticated customer's wishlist items with availability status",
  })
  @ApiResponse({ status: 200, description: 'Paginated wishlist products' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listWishlist(@CurrentUser() user: AuthenticatedUser, @Query() query: WishlistQueryDto) {
    return this.wishlistService.listWishlist(user.id, query);
  }

  @Post('wishlist')
  @ApiOperation({ summary: 'Add a product to the wishlist' })
  @ApiResponse({ status: 201, description: 'Product added to wishlist' })
  @ApiResponse({ status: 400, description: 'Archived product or unavailable store' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Product already in wishlist' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addToWishlist(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddWishlistItemDto) {
    return this.wishlistService.addToWishlist(user.id, dto);
  }

  @Delete('wishlist/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a product or item from the wishlist' })
  @ApiResponse({ status: 200, description: 'Item removed from wishlist' })
  @ApiResponse({ status: 404, description: 'Wishlist item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeFromWishlist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
  ) {
    return this.wishlistService.removeFromWishlist(user.id, itemId);
  }
}
