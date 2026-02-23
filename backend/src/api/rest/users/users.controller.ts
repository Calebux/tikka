import { Controller, Get, Param, Query, UsePipes } from '@nestjs/common';
import { Public } from '../../../auth/decorators/public.decorator';
import { UsersService } from './users.service';
import { UserHistoryQuerySchema, type UserHistoryQueryDto } from './dto/user-history-query.dto';
import { createZodPipe } from '../raffles/pipes/zod-validation.pipe';

@Controller('users')
@Public()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/:address — User profile.
   * Returns: address, total_tickets_bought, total_raffles_entered,
   *          total_raffles_won, total_prize_xlm, first_seen_ledger, updated_at.
   */
  @Get(':address')
  async getByAddress(@Param('address') address: string) {
    return this.usersService.getByAddress(address);
  }

  /**
   * GET /users/:address/history — Paginated raffle participation history.
   * Query params: limit (1–100, default 20), offset (default 0).
   */
  @Get(':address/history')
  @UsePipes(new (createZodPipe(UserHistoryQuerySchema))())
  async getHistory(
    @Param('address') address: string,
    @Query() query: UserHistoryQueryDto,
  ) {
    return this.usersService.getHistory(address, query);
  }
}
