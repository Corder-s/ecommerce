import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomerProfileService } from './services/customer-profile.service';
import { CustomerAddressesService } from './services/customer-addresses.service';
import { CustomerWishlistService } from './services/customer-wishlist.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomerProfileService, CustomerAddressesService, CustomerWishlistService],
  exports: [CustomerProfileService, CustomerAddressesService, CustomerWishlistService],
})
export class CustomersModule {}
